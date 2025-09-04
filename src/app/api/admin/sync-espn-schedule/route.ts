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
  location: string
  name: string
}

interface ESPNCompetitor {
  id: string
  homeAway: string
  team: ESPNTeam
}

interface ESPNCompetition {
  id: string
  date: string
  competitors: ESPNCompetitor[]
  status: {
    type: {
      completed: boolean
    }
  }
}

interface ESPNEvent {
  id: string
  date: string
  competitions: ESPNCompetition[]
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const week = searchParams.get('week') || '1'
    const year = searchParams.get('year') || '2025'
    
    // Fetch from ESPN API for 2025 NFL Week 1
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&seasontype=2&dates=${year}`
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; PickemParty/2.0)'
      }
    })
    
    if (!response.ok) {
      console.error('ESPN API error:', response.status)
      return NextResponse.json({ 
        success: false, 
        error: `ESPN API error: ${response.status}` 
      })
    }
    
    const data = await response.json()
    
    // Get team mappings from our database
    const { data: teams } = await supabase.from('teams').select('*')
    const teamMap = new Map()
    teams?.forEach(team => {
      teamMap.set(team.key, team.team_id)
    })
    
    let updatedCount = 0
    let insertedCount = 0
    const processedGames: any[] = []
    
    if (data.events && Array.isArray(data.events)) {
      for (const event of data.events) {
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
        
        // Game time from ESPN (already in UTC)
        const gameTime = event.date || competition.date
        
        processedGames.push({
          away: awayTeamKey,
          home: homeTeamKey,
          time: gameTime,
          espnId: event.id
        })
        
        // Check if game already exists
        const { data: existingGame } = await supabase
          .from('games')
          .select('id')
          .eq('home_team_id', homeTeamId)
          .eq('away_team_id', awayTeamId)
          .eq('week', parseInt(week))
          .eq('season_year', parseInt(year))
          .single()
        
        if (existingGame) {
          // Update existing game with correct time
          const { error: updateError } = await supabase
            .from('games')
            .update({
              game_time: gameTime,
              espn_event_id: event.id
            })
            .eq('id', existingGame.id)
          
          if (!updateError) {
            updatedCount++
            console.log(`Updated ${awayTeamKey} @ ${homeTeamKey}: ${gameTime}`)
          } else {
            console.error(`Failed to update game:`, updateError)
          }
        } else {
          // Insert new game
          const { error: insertError } = await supabase
            .from('games')
            .insert({
              week: parseInt(week),
              season_year: parseInt(year),
              home_team_id: homeTeamId,
              away_team_id: awayTeamId,
              game_time: gameTime,
              espn_event_id: event.id,
              is_final: false
            })
          
          if (!insertError) {
            insertedCount++
            console.log(`Inserted ${awayTeamKey} @ ${homeTeamKey}: ${gameTime}`)
          } else {
            console.error(`Failed to insert game:`, insertError)
          }
        }
      }
    }
    
    return NextResponse.json({ 
      success: true,
      message: `ESPN sync complete for Week ${week}, ${year}`,
      updated: updatedCount,
      inserted: insertedCount,
      totalProcessed: processedGames.length,
      games: processedGames
    })
    
  } catch (error) {
    console.error('ESPN sync error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to sync ESPN schedule',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}