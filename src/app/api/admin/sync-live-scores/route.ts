import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface ESPNTeam {
  id: string
  abbreviation: string
  displayName: string
  score: string
}

interface ESPNCompetitor {
  id: string
  homeAway: string
  team: ESPNTeam
  score: string
}

// ESPNStatus interface removed as it's only used internally

// Removed unused interfaces for cleaner build

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const forceSync = searchParams.get('force') === 'true'
    
    console.log('Starting live score sync...')
    
    // Get current live games from ESPN scoreboard
    const scoreboardResponse = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; PickemParty/2.0)'
      }
    })

    if (!scoreboardResponse.ok) {
      console.error('ESPN scoreboard API error:', scoreboardResponse.status)
      return NextResponse.json({ 
        success: false, 
        error: `ESPN API error: ${scoreboardResponse.status}` 
      })
    }

    const scoreboardData = await scoreboardResponse.json()
    const events = scoreboardData.events || []
    
    console.log(`Found ${events.length} games from ESPN`)

    // Get team mappings from our database
    const { data: teams } = await supabase.from('teams').select('*')
    const teamMap = new Map()
    teams?.forEach(team => {
      teamMap.set(team.key, team.team_id)
    })

    let updatedGames = 0
    let liveGames = 0
    let completedGames = 0

    for (const event of events) {
      const competition = event.competitions?.[0]
      if (!competition) continue

      const homeCompetitor = competition.competitors.find((c: ESPNCompetitor) => c.homeAway === 'home')
      const awayCompetitor = competition.competitors.find((c: ESPNCompetitor) => c.homeAway === 'away')
      
      if (!homeCompetitor || !awayCompetitor) continue

      const homeTeamKey = homeCompetitor.team.abbreviation
      const awayTeamKey = awayCompetitor.team.abbreviation
      const homeTeamId = teamMap.get(homeTeamKey)
      const awayTeamId = teamMap.get(awayTeamKey)

      if (!homeTeamId || !awayTeamId) {
        console.log(`Skipping game: Unknown teams ${awayTeamKey} @ ${homeTeamKey}`)
        continue
      }

      // Determine game status
      const status = event.status || competition.status
      const isLive = status.type.state === 'in' || status.type.name.includes('STATUS_IN_PROGRESS') || status.type.name.includes('HALFTIME')
      const isCompleted = status.type.completed || status.type.state === 'post'

      // Only sync if game is live, completed, or force sync
      if (!isLive && !isCompleted && !forceSync) {
        continue
      }

      if (isLive) liveGames++
      if (isCompleted) completedGames++

      const homeScore = parseInt(homeCompetitor.score || '0')
      const awayScore = parseInt(awayCompetitor.score || '0')

      console.log(`${awayTeamKey} ${awayScore} @ ${homeTeamKey} ${homeScore} - ${status.type.description}`)

      // Find the game in our database
      const { data: existingGame } = await supabase
        .from('games')
        .select('id, home_score, away_score, is_final')
        .eq('home_team_id', homeTeamId)
        .eq('away_team_id', awayTeamId)
        .eq('season_year', 2025)
        .single()

      if (!existingGame) {
        console.log(`Game not found in database: ${awayTeamKey} @ ${homeTeamKey}`)
        continue
      }

      // Check if scores have changed or status changed
      const scoresChanged = existingGame.home_score !== homeScore || existingGame.away_score !== awayScore
      const statusChanged = existingGame.is_final !== isCompleted

      if (scoresChanged || statusChanged || forceSync) {
        // Update game scores and status
        const { error: updateError } = await supabase
          .from('games')
          .update({
            home_score: homeScore,
            away_score: awayScore,
            is_final: isCompleted,
            game_status: status.type.description,
            last_updated: new Date().toISOString()
          })
          .eq('id', existingGame.id)

        if (updateError) {
          console.error(`Failed to update game ${existingGame.id}:`, updateError)
        } else {
          updatedGames++
          console.log(`Updated: ${awayTeamKey} ${awayScore} @ ${homeTeamKey} ${homeScore} - ${isCompleted ? 'FINAL' : status.type.description}`)
        }

        // If game just completed, update pick results
        if (isCompleted && !existingGame.is_final) {
          await updatePickResults(existingGame.id, homeTeamId, awayTeamId, homeScore, awayScore)
        }
      }
    }

    console.log(`Sync complete: ${updatedGames} games updated, ${liveGames} live, ${completedGames} completed`)

    return NextResponse.json({
      success: true,
      message: `Score sync complete`,
      updatedGames,
      liveGames,
      completedGames,
      totalProcessed: events.length
    })

  } catch (error) {
    console.error('Live score sync error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to sync live scores',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function updatePickResults(gameId: string, homeTeamId: number, awayTeamId: number, homeScore: number, awayScore: number) {
  try {
    const winningTeamId = homeScore > awayScore ? homeTeamId : awayTeamId
    
    // Get all picks for this game
    const { data: gamePicks, error: fetchError } = await supabase
      .from('picks')
      .select('id, team_id')
      .eq('game_id', gameId)

    if (fetchError) {
      console.error(`Failed to fetch picks for game ${gameId}:`, fetchError)
      return
    }

    // Update each pick's correctness
    for (const pick of gamePicks || []) {
      const { error: updateError } = await supabase
        .from('picks')
        .update({
          is_correct: pick.team_id === winningTeamId
        })
        .eq('id', pick.id)

      if (updateError) {
        console.error(`Failed to update pick ${pick.id}:`, updateError)
      }
    }

    console.log(`Updated pick results for game ${gameId} - Winner: ${winningTeamId}`)

    // TODO: Update user elimination status based on incorrect picks
    // This would require more complex logic to check if users have remaining lives
    
  } catch (error) {
    console.error(`Error updating pick results for game ${gameId}:`, error)
  }
}