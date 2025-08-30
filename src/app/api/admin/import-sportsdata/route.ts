import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    const { season, week, seasonType = 1 } = await request.json()
    const apiKey = process.env.SPORTSDATA_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API key not configured' })
    }

    if (!season) {
      return NextResponse.json({ success: false, error: 'Season year required' })
    }

    // Determine which endpoint to use based on parameters
    let endpoint = ''
    if (week) {
      // Fetch specific week
      endpoint = `https://api.sportsdata.io/v3/nfl/stats/json/ScoresByWeek/${season}/${week}?key=${apiKey}`
    } else {
      // Fetch entire season
      endpoint = `https://api.sportsdata.io/v3/nfl/stats/json/Scores/${season}?key=${apiKey}`
    }

    console.log(`Fetching from: ${endpoint}`)
    const response = await fetch(endpoint)
    
    if (!response.ok) {
      return NextResponse.json({ 
        success: false, 
        error: `SportsData API error: ${response.status}` 
      })
    }

    const games = await response.json()
    
    if (!Array.isArray(games)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid response format from API' 
      })
    }

    let importedCount = 0
    let updatedCount = 0
    let skippedCount = 0

    for (const game of games) {
      // Skip games without any ID (sometimes API returns incomplete data)
      if (!game.ScoreID && !game.GameID) {
        console.log('Skipping game without ID:', game.GameKey)
        skippedCount++
        continue
      }
      
      // Use ScoreID as primary identifier (GameID is often null)
      const gameId = game.ScoreID || game.GameID
      
      // Only process games of the specified season type
      if (seasonType && game.SeasonType !== seasonType) {
        skippedCount++
        continue
      }

      // Check if game already exists
      const { data: existingGame } = await supabase
        .from('sportsdata_games')
        .select('id, game_id')
        .eq('game_id', gameId)
        .single()

      const gameData = {
        game_id: gameId,
        game_key: game.GameKey,
        season_type: game.SeasonType,
        season: game.Season,
        week: game.Week,
        date: game.DateTime || game.Date,
        away_team: game.AwayTeam,
        home_team: game.HomeTeam,
        away_score: game.AwayScore,
        home_score: game.HomeScore,
        away_score_q1: game.AwayScoreQuarter1,
        away_score_q2: game.AwayScoreQuarter2,
        away_score_q3: game.AwayScoreQuarter3,
        away_score_q4: game.AwayScoreQuarter4,
        away_score_ot: game.AwayScoreOvertime,
        home_score_q1: game.HomeScoreQuarter1,
        home_score_q2: game.HomeScoreQuarter2,
        home_score_q3: game.HomeScoreQuarter3,
        home_score_q4: game.HomeScoreQuarter4,
        home_score_ot: game.HomeScoreOvertime,
        quarter: game.Quarter,
        time_remaining: game.TimeRemaining,
        possession: game.Possession,
        down: game.Down,
        distance: game.Distance,
        yard_line: game.YardLine,
        yard_line_territory: game.YardLineTerritory,
        red_zone: game.RedZone || false,
        point_spread: game.PointSpread,
        over_under: game.OverUnder,
        channel: game.Channel,
        status: game.Status,
        is_final: game.Status === 'Final' || game.Status === 'F' || game.Status === 'FinalOT',
        is_final_overtime: game.Status === 'FinalOT',
        raw_data: game,
        last_sync_at: new Date().toISOString()
      }

      if (existingGame) {
        // Update existing game
        const { error } = await supabase
          .from('sportsdata_games')
          .update({
            ...gameData,
            updated_at: new Date().toISOString()
          })
          .eq('game_id', gameId)

        if (!error) {
          updatedCount++
        } else {
          console.error(`Failed to update game ${gameId}:`, error)
        }
      } else {
        // Insert new game
        const { error } = await supabase
          .from('sportsdata_games')
          .insert(gameData)

        if (!error) {
          importedCount++
        } else {
          console.error(`Failed to insert game ${gameId}:`, error)
        }
      }
    }

    // Now sync finalized games to main games table
    const { data: syncResult } = await supabase
      .rpc('sync_sportsdata_to_games')

    return NextResponse.json({ 
      success: true,
      season,
      week: week || 'all',
      totalGames: games.length,
      imported: importedCount,
      updated: updatedCount,
      skipped: skippedCount,
      syncedToMainTable: syncResult || 0,
      message: `Imported ${importedCount} new games, updated ${updatedCount} existing games`
    })
  } catch (error) {
    console.error('SportsData import error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Import failed',
      details: String(error)
    })
  }
}