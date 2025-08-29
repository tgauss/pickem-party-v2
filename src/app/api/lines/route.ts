import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const apiKey = process.env.SPORTSDATA_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API key not configured' })
    }

    // Fetch Week 1 betting lines from SportsData.io
    const response = await fetch(`https://api.sportsdata.io/v3/nfl/odds/json/GameOddsByWeek/2025REG/1?key=${apiKey}`)
    
    if (!response.ok) {
      return NextResponse.json({ success: false, error: 'SportsData API error' })
    }

    const odds = await response.json()
    
    // Process odds to get the consensus lines
    const gameLines = new Map()
    
    for (const game of odds) {
      if (!game.GameOdds || game.GameOdds.length === 0) continue
      
      // Get the most recent pregame odds
      const pregameOdds = game.GameOdds
        .filter((o: any) => o.GameOddType === 'Game')
        .sort((a: any, b: any) => new Date(b.Created).getTime() - new Date(a.Created).getTime())[0]
      
      if (pregameOdds) {
        gameLines.set(game.GameKey, {
          homeTeam: game.HomeTeam,
          awayTeam: game.AwayTeam,
          spread: pregameOdds.HomePointSpread,
          overUnder: pregameOdds.OverUnder,
          homeMoneyLine: pregameOdds.HomeMoneyLine,
          awayMoneyLine: pregameOdds.AwayMoneyLine
        })
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      lines: Object.fromEntries(gameLines)
    })
  } catch (error) {
    console.error('Lines fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch lines' })
  }
}