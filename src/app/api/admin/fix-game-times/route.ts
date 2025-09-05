import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Actual NFL Week 1 games for September 2025
const week14Games2024 = [
  // Thursday Night Football - December 5, 2024
  { away: 'GB', home: 'DET', time: '2024-12-06T01:15:00Z' }, // 8:15 PM ET Thu
  
  // Sunday Early Games - December 8, 2024
  { away: 'ATL', home: 'MIN', time: '2024-12-08T18:00:00Z' }, // 1:00 PM ET
  { away: 'CLE', home: 'PIT', time: '2024-12-08T18:00:00Z' }, // 1:00 PM ET
  { away: 'NYJ', home: 'MIA', time: '2024-12-08T18:00:00Z' }, // 1:00 PM ET
  { away: 'LV', home: 'TB', time: '2024-12-08T18:00:00Z' }, // 1:00 PM ET
  { away: 'NO', home: 'NYG', time: '2024-12-08T18:00:00Z' }, // 1:00 PM ET
  { away: 'CAR', home: 'PHI', time: '2024-12-08T18:00:00Z' }, // 1:00 PM ET
  { away: 'JAX', home: 'TEN', time: '2024-12-08T18:00:00Z' }, // 1:00 PM ET
  
  // Sunday Late Afternoon Games - December 8, 2024
  { away: 'SEA', home: 'ARI', time: '2024-12-08T21:05:00Z' }, // 4:05 PM ET
  { away: 'CHI', home: 'SF', time: '2024-12-08T21:25:00Z' }, // 4:25 PM ET
  { away: 'BUF', home: 'LAR', time: '2024-12-08T21:25:00Z' }, // 4:25 PM ET
  
  // Sunday Night Football - December 8, 2024
  { away: 'LAC', home: 'KC', time: '2024-12-09T01:20:00Z' }, // 8:20 PM ET
  
  // Monday Night Football - December 9, 2024
  { away: 'CIN', home: 'DAL', time: '2024-12-10T01:15:00Z' }, // 8:15 PM ET Mon
]

// Map current week to Week 1 in our app
const APP_WEEK = 1

export async function POST() {
  try {
    let updatedCount = 0
    
    // Get all Week 1 games from database
    const { data: games, error: fetchError } = await supabase
      .from('games')
      .select(`
        id,
        home_team_id,
        away_team_id,
        home_team:teams!games_home_team_id_fkey(key),
        away_team:teams!games_away_team_id_fkey(key)
      `)
      .eq('week', APP_WEEK)
      .eq('season_year', 2025)

    if (fetchError || !games) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch games' 
      })
    }

    // Update each game with correct 2024 time
    for (const game of games) {
      const homeKey = (game.home_team as unknown as { key: string })?.key
      const awayKey = (game.away_team as unknown as { key: string })?.key
      
      // Find matching game in our week 14 schedule
      const matchingGame = week14Games2024.find(g => 
        g.home === homeKey && g.away === awayKey
      )
      
      if (matchingGame) {
        const { error: updateError } = await supabase
          .from('games')
          .update({ 
            game_time: matchingGame.time,
            season_year: 2025 // Update season year
          })
          .eq('id', game.id)
        
        if (!updateError) {
          updatedCount++
          console.log(`Updated ${awayKey} @ ${homeKey} to ${matchingGame.time}`)
        } else {
          console.error(`Failed to update game ${game.id}:`, updateError)
        }
      } else {
        console.log(`No match found for ${awayKey} @ ${homeKey}`)
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `Updated ${updatedCount} games to correct 2025 times`,
      updatedCount
    })
    
  } catch (error) {
    console.error('Fix game times error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fix game times' 
    })
  }
}