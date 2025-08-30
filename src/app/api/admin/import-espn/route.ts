import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    const { season, week, seasonType = 2 } = await request.json()

    // Build ESPN API URL
    let url = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard'
    const params = new URLSearchParams()
    
    if (week) params.append('week', week.toString())
    if (seasonType) params.append('seasontype', seasonType.toString())
    if (season) params.append('dates', season.toString())

    if (params.toString()) {
      url += '?' + params.toString()
    }

    console.log(`Fetching from ESPN: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; PickemParty/1.0)'
      }
    })
    
    if (!response.ok) {
      return NextResponse.json({ 
        success: false, 
        error: `ESPN API error: ${response.status}` 
      })
    }

    const data = await response.json()
    
    if (!data.events || !Array.isArray(data.events)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid response format from ESPN API' 
      })
    }

    // Get team mapping (ESPN ID -> our team_id)
    const { data: teams } = await supabase
      .from('teams')
      .select('team_id, key')
    
    const teamMap = new Map()
    teams?.forEach(team => {
      teamMap.set(team.team_id, team.team_id) // ESPN team_id matches our team_id now
    })

    let importedCount = 0
    let updatedCount = 0
    let skippedCount = 0

    for (const event of data.events) {
      try {
        // Extract competition data (first competition in the event)
        const competition = event.competitions?.[0]
        if (!competition || !competition.competitors || competition.competitors.length !== 2) {
          console.log(`Skipping event ${event.id}: Invalid competition data`)
          skippedCount++
          continue
        }

        // Get teams
        const homeCompetitor = competition.competitors.find(c => c.homeAway === 'home')
        const awayCompetitor = competition.competitors.find(c => c.homeAway === 'away')
        
        if (!homeCompetitor || !awayCompetitor) {
          console.log(`Skipping event ${event.id}: Could not determine home/away teams`)
          skippedCount++
          continue
        }

        const homeTeamId = parseInt(homeCompetitor.team.id)
        const awayTeamId = parseInt(awayCompetitor.team.id)

        // Verify teams exist in our database
        if (!teamMap.has(homeTeamId) || !teamMap.has(awayTeamId)) {
          console.log(`Skipping event ${event.id}: Teams not found - Home: ${homeTeamId}, Away: ${awayTeamId}`)
          skippedCount++
          continue
        }

        // Extract game data
        const gameData = {
          espn_event_id: event.id,
          season_year: parseInt(event.season?.year || season || new Date().getFullYear()),
          season_type: parseInt(event.season?.type || seasonType || 2),
          week: parseInt(event.week?.number || week || 1),
          game_date: new Date(event.date).toISOString(),
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          home_team_name: homeCompetitor.team.displayName,
          away_team_name: awayCompetitor.team.displayName,
          home_score: homeCompetitor.score ? parseInt(homeCompetitor.score) : null,
          away_score: awayCompetitor.score ? parseInt(awayCompetitor.score) : null,
          game_status: competition.status?.type?.name || 'STATUS_SCHEDULED',
          game_status_detail: competition.status?.type?.detail || '',
          is_completed: competition.status?.type?.completed || false,
          broadcast_network: competition.broadcasts?.[0]?.media?.shortName || null,
          raw_data: event,
          last_sync: new Date().toISOString()
        }

        // Check if game already exists
        const { data: existingGame } = await supabase
          .from('espn_games_raw')
          .select('id')
          .eq('espn_event_id', event.id)
          .single()

        if (existingGame) {
          // Update existing game
          const { error } = await supabase
            .from('espn_games_raw')
            .update({
              ...gameData,
              updated_at: new Date().toISOString()
            })
            .eq('espn_event_id', event.id)

          if (!error) {
            updatedCount++
          } else {
            console.error(`Failed to update game ${event.id}:`, error)
          }
        } else {
          // Insert new game
          const { error } = await supabase
            .from('espn_games_raw')
            .insert(gameData)

          if (!error) {
            importedCount++
          } else {
            console.error(`Failed to insert game ${event.id}:`, error)
            console.error('Game data:', gameData)
          }
        }
      } catch (gameError) {
        console.error(`Error processing event ${event.id}:`, gameError)
        skippedCount++
      }
    }

    // Sync to main games table
    const { data: syncResult } = await supabase.rpc('sync_espn_to_games')

    return NextResponse.json({ 
      success: true,
      season: season || 'current',
      week: week || 'current',
      seasonType,
      totalEvents: data.events.length,
      imported: importedCount,
      updated: updatedCount,
      skipped: skippedCount,
      syncedToMainTable: syncResult || 0,
      message: `Imported ${importedCount} new games, updated ${updatedCount} existing games from ESPN`
    })
  } catch (error) {
    console.error('ESPN import error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'ESPN import failed',
      details: String(error)
    })
  }
}