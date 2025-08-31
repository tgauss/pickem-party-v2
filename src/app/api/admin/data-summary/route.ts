import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    // Get game counts by week for regular season
    const { data: regularSeasonGames } = await supabase
      .from('games')
      .select('week, is_final')
      .eq('season_year', 2025)
      .lte('week', 18) // Regular season weeks 1-18
      .order('week')

    // Get playoff games
    const { data: playoffGames } = await supabase
      .from('games')
      .select('week, is_final')
      .eq('season_year', 2025)
      .gt('week', 18) // Playoff weeks 19+
      .order('week')

    // Group regular season by week
    const regularSeasonSummary: Record<string, { total: number, completed: number }> = {}
    regularSeasonGames?.forEach(game => {
      const week = game.week.toString()
      if (!regularSeasonSummary[week]) {
        regularSeasonSummary[week] = { total: 0, completed: 0 }
      }
      regularSeasonSummary[week].total++
      if (game.is_final) {
        regularSeasonSummary[week].completed++
      }
    })

    // Group playoffs by week
    const playoffSummary: Record<string, { total: number, completed: number }> = {}
    playoffGames?.forEach(game => {
      const week = game.week.toString()
      if (!playoffSummary[week]) {
        playoffSummary[week] = { total: 0, completed: 0 }
      }
      playoffSummary[week].total++
      if (game.is_final) {
        playoffSummary[week].completed++
      }
    })

    // Get total counts
    const { count: totalGames } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .eq('season_year', 2025)

    const { count: completedGames } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .eq('season_year', 2025)
      .eq('is_final', true)

    const { count: synced_games } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .eq('season_year', 2025)

    // Sample of recent games for data quality check
    const { data: sampleGames } = await supabase
      .from('games')
      .select('sports_data_game_id, week, home_team_id, away_team_id, home_score, away_score, is_final')
      .eq('season_year', 2025)
      .order('week', { ascending: false })
      .limit(5)

    return NextResponse.json({
      success: true,
      season: 2025,
      summary: {
        total_games: totalGames || 0,
        completed_games: completedGames || 0,
        synced_to_main_games: synced_games || 0,
        completion_rate: totalGames && completedGames ? Math.round((completedGames / totalGames) * 100) : 0
      },
      regular_season: {
        weeks: Object.keys(regularSeasonSummary).length,
        games_by_week: regularSeasonSummary
      },
      playoffs: {
        weeks: Object.keys(playoffSummary).length,
        games_by_week: playoffSummary
      },
      sample_games: sampleGames
    })
  } catch (error) {
    console.error('Data summary error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to generate data summary'
    })
  }
}