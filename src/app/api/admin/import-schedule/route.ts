import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST() {
  try {
    const apiKey = process.env.SPORTSDATA_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API key not configured' })
    }

    // Fetch 2024 NFL schedule from SportsData.io
    const response = await fetch(`https://api.sportsdata.io/v3/nfl/scores/json/SchedulesBasic/2024?key=${apiKey}`)
    
    if (!response.ok) {
      return NextResponse.json({ success: false, error: 'SportsData API error' })
    }

    const schedule = await response.json()
    let importedCount = 0

    // Get team mappings from our database
    const { data: teams } = await supabase.from('teams').select('*')
    const teamMap = new Map()
    teams?.forEach(team => {
      teamMap.set(team.key, team.team_id)
    })

    // Process each game
    for (const game of schedule) {
      // Skip if not regular season
      if (game.SeasonType !== 1) continue
      
      const homeTeamId = teamMap.get(game.HomeTeam)
      const awayTeamId = teamMap.get(game.AwayTeam)
      
      if (!homeTeamId || !awayTeamId) {
        console.log(`Skipping game: Unknown teams ${game.HomeTeam} vs ${game.AwayTeam}`)
        continue
      }

      // Check if game already exists
      const { data: existingGame } = await supabase
        .from('games')
        .select('id')
        .eq('sports_data_game_id', game.GameID)
        .single()

      if (existingGame) {
        console.log(`Game ${game.GameID} already exists, skipping`)
        continue
      }

      // Insert new game
      const { error } = await supabase
        .from('games')
        .insert({
          sports_data_game_id: game.GameID,
          week: game.Week,
          season_year: game.Season,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          game_time: game.DateTime,
          home_score: game.HomeScore || null,
          away_score: game.AwayScore || null,
          is_final: game.Status === 'Final' || game.Status === 'F'
        })
      
      if (!error) {
        importedCount++
      } else {
        console.error(`Failed to insert game ${game.GameID}:`, error)
      }
    }

    return NextResponse.json({ 
      success: true, 
      imported: importedCount,
      total: schedule.length 
    })
  } catch (error) {
    console.error('Schedule import error:', error)
    return NextResponse.json({ success: false, error: 'Import failed' })
  }
}