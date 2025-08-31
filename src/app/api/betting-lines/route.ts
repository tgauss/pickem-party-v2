import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const week = searchParams.get('week') || '1'
    const seasonYear = searchParams.get('season') || '2025'

    // Get games for the specified week
    const { data: games } = await supabase
      .from('games')
      .select(`
        id,
        home_team_id,
        away_team_id,
        game_time,
        home_team:teams!games_home_team_id_fkey(key, city, name),
        away_team:teams!games_away_team_id_fkey(key, city, name)
      `)
      .eq('week', week)
      .eq('season_year', seasonYear)

    if (!games || games.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No games found for specified week' 
      })
    }

    // Check if we have recent lines (within last 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    
    const { data: existingLines } = await supabase
      .from('betting_lines')
      .select('*')
      .in('game_id', games.map(g => g.id))
      .gte('fetched_at', thirtyMinutesAgo)

    // If we have recent lines, return them
    if (existingLines && existingLines.length > 0) {
      const linesMap = existingLines.reduce((acc, line) => {
        const game = games.find(g => g.id === line.game_id)
        if (game) {
          const awayKey = game.away_team.key
          const homeKey = game.home_team.key
          const gameKey = `${awayKey}@${homeKey}`
          
          acc[gameKey] = {
            gameId: game.id,
            homeTeam: homeKey,
            awayTeam: awayKey,
            spread: parseFloat(line.home_spread || '0'),
            overUnder: parseFloat(line.over_under || '0'),
            homeMoneyLine: line.home_moneyline || 0,
            awayMoneyLine: line.away_moneyline || 0,
            fetchedAt: line.fetched_at
          }
        }
        return acc
      }, {} as Record<string, any>)

      return NextResponse.json({
        success: true,
        lines: linesMap,
        cached: true,
        cacheAge: 'Recent (within 30 minutes)'
      })
    }

    // Fetch fresh lines from external API (simulate for now)
    const freshLines: Record<string, any> = {}
    const linesToStore = []

    for (const game of games) {
      const awayKey = game.away_team.key
      const homeKey = game.home_team.key
      const gameKey = `${awayKey}@${homeKey}`
      
      // Mock betting lines (in production, fetch from real API)
      const mockSpread = (Math.random() * 14 - 7).toFixed(1) // -7 to +7
      const mockTotal = (42 + Math.random() * 16).toFixed(1) // 42-58 points
      const mockHomeML = Math.random() < 0.5 ? -(100 + Math.random() * 300) : (100 + Math.random() * 300)
      const mockAwayML = mockHomeML < 0 ? Math.abs(mockHomeML) + 20 : -(Math.abs(mockHomeML) - 20)

      freshLines[gameKey] = {
        gameId: game.id,
        homeTeam: homeKey,
        awayTeam: awayKey,
        spread: parseFloat(mockSpread),
        overUnder: parseFloat(mockTotal),
        homeMoneyLine: Math.round(mockHomeML),
        awayMoneyLine: Math.round(mockAwayML),
        fetchedAt: new Date().toISOString()
      }

      // Prepare for database storage
      linesToStore.push({
        game_id: game.id,
        home_team_id: game.home_team_id,
        away_team_id: game.away_team_id,
        home_spread: parseFloat(mockSpread),
        away_spread: -parseFloat(mockSpread), // Opposite of home spread
        over_under: parseFloat(mockTotal),
        home_moneyline: Math.round(mockHomeML),
        away_moneyline: Math.round(mockAwayML),
        source: 'mock_api',
        fetched_at: new Date().toISOString()
      })
    }

    // Store lines in database
    const { error: insertError } = await supabase
      .from('betting_lines')
      .insert(linesToStore)

    if (insertError) {
      console.error('Error storing betting lines:', insertError)
      // Still return the lines even if storage fails
    }

    return NextResponse.json({
      success: true,
      lines: freshLines,
      cached: false,
      stored: !insertError,
      gamesProcessed: games.length
    })

  } catch (error) {
    console.error('Betting lines API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch betting lines' 
    })
  }
}