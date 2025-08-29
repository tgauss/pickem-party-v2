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

    // Fetch 2024 NFL final scores
    const response = await fetch(`https://api.sportsdata.io/v3/nfl/stats/json/ScoresFinal/2024?key=${apiKey}`)
    
    if (!response.ok) {
      return NextResponse.json({ success: false, error: 'SportsData API error' })
    }

    const games = await response.json()
    let importedCount = 0

    // Get team mappings from our database  
    const { data: teams } = await supabase.from('teams').select('*')
    const teamMap = new Map()
    teams?.forEach(team => {
      teamMap.set(team.key, team.team_id)
    })

    // Process games weeks 1-6 only for testing
    for (const game of games) {
      // Only process regular season weeks 1-6
      if (game.SeasonType !== 1 || game.Week > 6) continue
      
      const homeTeamId = teamMap.get(game.HomeTeam)
      const awayTeamId = teamMap.get(game.AwayTeam)
      
      if (!homeTeamId || !awayTeamId) {
        console.log(`Skipping game: Unknown teams ${game.HomeTeam} vs ${game.AwayTeam}`)
        continue
      }

      // Check if game already exists (by week/teams to avoid duplicates)
      const { data: existingGame } = await supabase
        .from('games')
        .select('id')
        .eq('week', game.Week)
        .eq('season_year', 2024) 
        .eq('home_team_id', homeTeamId)
        .eq('away_team_id', awayTeamId)
        .single()

      if (existingGame) {
        continue
      }

      // Insert historical game with results
      const { error } = await supabase
        .from('games')
        .insert({
          sports_data_game_id: game.GameID,
          week: game.Week,
          season_year: 2024, // Historical data
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
      message: `Imported ${importedCount} games from 2024 weeks 1-6`
    })
  } catch (error) {
    console.error('2024 results import error:', error)
    return NextResponse.json({ success: false, error: 'Import failed' })
  }
}