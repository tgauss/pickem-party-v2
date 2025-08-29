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

    // Fetch current week scores from SportsData.io
    const response = await fetch(`https://api.sportsdata.io/v3/nfl/scores/json/ScoresByWeek/2025REG/1?key=${apiKey}`)
    
    if (!response.ok) {
      return NextResponse.json({ success: false, error: 'SportsData API error' })
    }

    const scores = await response.json()
    let updatedCount = 0

    // Update each game in our database
    for (const score of scores) {
      if (score.Status === 'Final' || score.Status === 'F') {
        const { error } = await supabase
          .from('games')
          .update({
            home_score: score.HomeScore,
            away_score: score.AwayScore,
            is_final: true
          })
          .eq('sports_data_game_id', score.GameID)
        
        if (!error) updatedCount++
      }
    }

    // Process eliminations for finalized games
    await processEliminations()

    return NextResponse.json({ success: true, updated: updatedCount })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ success: false, error: 'Sync failed' })
  }
}

async function processEliminations() {
  // Get all picks for finalized games
  const { data: picks } = await supabase
    .from('picks')
    .select(`
      *,
      games(*),
      league_members(*)
    `)
    .eq('week', 1)
  
  if (!picks) return

  for (const pick of picks) {
    const game = pick.games
    if (!game?.is_final) continue

    const playerWon = (
      (game.home_team_id === pick.team_id && game.home_score > game.away_score) ||
      (game.away_team_id === pick.team_id && game.away_score > game.home_score)
    )

    // Update pick result
    await supabase
      .from('picks')
      .update({ is_correct: playerWon })
      .eq('id', pick.id)

    // If player lost, reduce lives
    if (!playerWon) {
      const member = pick.league_members
      const newLives = member.lives_remaining - 1
      
      await supabase
        .from('league_members')
        .update({
          lives_remaining: newLives,
          is_eliminated: newLives <= 0,
          eliminated_week: newLives <= 0 ? 1 : null
        })
        .eq('user_id', pick.user_id)
        .eq('league_id', pick.league_id)
    }
  }
}