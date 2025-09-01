import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface BettingLineData {
  gameId: string
  homeTeam: string
  awayTeam: string
  spread: number
  overUnder: number
  homeMoneyLine: number
  awayMoneyLine: number
  fetchedAt: string
}

interface GameWithTeams {
  id: string
  home_team_id: number
  away_team_id: number
  game_time: string
  espn_event_id?: string
  home_team: { key: string; city: string; name: string }
  away_team: { key: string; city: string; name: string }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function fetchESPNOdds(week: string, season: string) {
  try {
    // Fetch from ESPN API
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&seasontype=2&dates=${season}`
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; PickemParty/1.0)'
      }
    })
    
    if (!response.ok) {
      console.error('ESPN API error:', response.status)
      return null
    }
    
    const data = await response.json()
    const oddsMap: Record<string, {
      homeTeamId: number
      awayTeamId: number
      spread: number
      overUnder: number
      homeMoneyline: number
      awayMoneyline: number
      details: string
      provider: string
    }> = {}
    
    if (data.events && Array.isArray(data.events)) {
      for (const event of data.events) {
        const competition = event.competitions?.[0]
        if (competition && competition.odds && competition.odds.length > 0) {
          // Get the most recent odds (usually the first one)
          const latestOdds = competition.odds[0]
          
          // Extract teams
          const homeCompetitor = competition.competitors.find((c: { homeAway: string }) => c.homeAway === 'home')
          const awayCompetitor = competition.competitors.find((c: { homeAway: string }) => c.homeAway === 'away')
          
          if (homeCompetitor && awayCompetitor) {
            // Parse moneyline odds (convert string to number)
            let homeMoneyline = 0
            let awayMoneyline = 0
            
            if (latestOdds.homeTeamOdds?.moneyLine) {
              homeMoneyline = latestOdds.homeTeamOdds.moneyLine
            }
            if (latestOdds.awayTeamOdds?.moneyLine) {
              awayMoneyline = latestOdds.awayTeamOdds.moneyLine
            }
            
            oddsMap[event.id] = {
              homeTeamId: parseInt(homeCompetitor.team.id),
              awayTeamId: parseInt(awayCompetitor.team.id),
              spread: latestOdds.spread || 0, // This is the home team spread
              overUnder: latestOdds.overUnder || 0,
              homeMoneyline: homeMoneyline,
              awayMoneyline: awayMoneyline,
              details: latestOdds.details || '',
              provider: latestOdds.provider?.name || 'ESPN'
            }
          }
        }
      }
    }
    
    return oddsMap
  } catch (error) {
    console.error('Error fetching ESPN odds:', error)
    return null
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const week = searchParams.get('week') || '1'
    const seasonYear = searchParams.get('season') || '2025'

    // Get games for the specified week with ESPN event IDs
    const result = await supabase
      .from('games')
      .select(`
        id,
        home_team_id,
        away_team_id,
        game_time,
        espn_event_id,
        home_team:teams!games_home_team_id_fkey(key, city, name),
        away_team:teams!games_away_team_id_fkey(key, city, name)
      `)
      .eq('week', week)
      .eq('season_year', seasonYear)
    
    const games = result.data as GameWithTeams[] | null

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
      }, {} as Record<string, BettingLineData>)

      return NextResponse.json({
        success: true,
        lines: linesMap,
        cached: true,
        cacheAge: 'Recent (within 30 minutes)'
      })
    }

    // Try to fetch fresh lines from ESPN
    const espnOdds = await fetchESPNOdds(week, seasonYear)
    
    const freshLines: Record<string, BettingLineData> = {}
    const linesToStore = []

    for (const game of games) {
      const awayKey = game.away_team.key
      const homeKey = game.home_team.key
      const gameKey = `${awayKey}@${homeKey}`
      
      // Try to get real odds from ESPN
      let spread = 0
      let overUnder = 0
      let homeMoneyLine = 0
      let awayMoneyLine = 0
      
      if (espnOdds && game.espn_event_id && espnOdds[game.espn_event_id]) {
        const odds = espnOdds[game.espn_event_id]
        spread = odds.spread || 0
        overUnder = odds.overUnder || 0
        homeMoneyLine = odds.homeMoneyline || 0
        awayMoneyLine = odds.awayMoneyline || 0
      } else {
        // Fallback to mock data if ESPN odds not available
        spread = parseFloat((Math.random() * 14 - 7).toFixed(1)) // -7 to +7
        overUnder = parseFloat((42 + Math.random() * 16).toFixed(1)) // 42-58 points
        homeMoneyLine = Math.random() < 0.5 ? -(100 + Math.random() * 300) : (100 + Math.random() * 300)
        awayMoneyLine = homeMoneyLine < 0 ? Math.abs(homeMoneyLine) + 20 : -(Math.abs(homeMoneyLine) - 20)
        homeMoneyLine = Math.round(homeMoneyLine)
        awayMoneyLine = Math.round(awayMoneyLine)
      }

      freshLines[gameKey] = {
        gameId: game.id,
        homeTeam: homeKey,
        awayTeam: awayKey,
        spread: spread,
        overUnder: overUnder,
        homeMoneyLine: homeMoneyLine,
        awayMoneyLine: awayMoneyLine,
        fetchedAt: new Date().toISOString()
      }

      // Prepare for database storage
      linesToStore.push({
        game_id: game.id,
        home_team_id: game.home_team_id,
        away_team_id: game.away_team_id,
        home_spread: spread,
        away_spread: -spread, // Opposite of home spread
        over_under: overUnder,
        home_moneyline: homeMoneyLine,
        away_moneyline: awayMoneyLine,
        source: espnOdds && game.espn_event_id && espnOdds[game.espn_event_id] ? 'espn' : 'mock_api',
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
      gamesProcessed: games.length,
      espnOddsFound: espnOdds ? Object.keys(espnOdds).length : 0
    })

  } catch (error) {
    console.error('Betting lines API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch betting lines' 
    })
  }
}