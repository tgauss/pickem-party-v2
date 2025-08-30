import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Check if we have recent odds (within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    
    const { data: cachedOdds } = await supabase
      .from('game_odds')
      .select('*')
      .eq('espn_event_id', eventId)
      .gte('last_updated', fiveMinutesAgo)
      .order('last_updated', { ascending: false })
      .limit(1)

    // Return cached odds if fresh enough
    if (cachedOdds && cachedOdds.length > 0) {
      console.log(`Returning cached odds for event ${eventId}`)
      return NextResponse.json({
        success: true,
        eventId,
        cached: true,
        odds: cachedOdds[0]
      })
    }

    // Fetch fresh odds from ESPN
    console.log(`Fetching fresh odds for event ${eventId}`)
    
    try {
      // First, get the event details from our database or ESPN scoreboard
      let gameData = null
      
      // Try to get from our ESPN raw games first
      const { data: rawGame } = await supabase
        .from('espn_games_raw')
        .select('raw_data')
        .eq('espn_event_id', eventId)
        .single()

      if (rawGame && rawGame.raw_data) {
        gameData = rawGame.raw_data
      } else {
        // Fallback: fetch from ESPN scoreboard API
        const scoreboardResponse = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`,
          {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (compatible; PickemParty/1.0)'
            }
          }
        )

        if (scoreboardResponse.ok) {
          const scoreboardData = await scoreboardResponse.json()
          gameData = scoreboardData.events?.find((e: { id: string }) => e.id === eventId)
        }
      }

      if (!gameData) {
        return NextResponse.json({
          success: false,
          error: `Game ${eventId} not found`
        })
      }

      // Extract odds from the game data
      const competition = gameData.competitions?.[0]
      const odds = competition?.odds?.[0]

      if (!odds) {
        return NextResponse.json({
          success: true,
          eventId,
          odds: null,
          message: 'No odds available for this game'
        })
      }

      // Parse odds data
      const oddsData = {
        espn_event_id: eventId,
        provider_name: odds.provider?.name || 'ESPN',
        home_spread: odds.spread || null,
        away_spread: odds.spread ? -odds.spread : null,
        home_spread_odds: odds.homeTeamOdds?.spreadOdds || null,
        away_spread_odds: odds.awayTeamOdds?.spreadOdds || null,
        home_moneyline: odds.homeTeamOdds?.moneyLine || null,
        away_moneyline: odds.awayTeamOdds?.moneyLine || null,
        over_under: odds.overUnder || null,
        over_odds: null, // ESPN doesn't always provide this
        under_odds: null, // ESPN doesn't always provide this
        odds_details: odds.details || null,
        raw_data: odds,
        last_updated: new Date().toISOString()
      }

      // Store/update odds in database
      const { error } = await supabase
        .from('game_odds')
        .upsert(oddsData, {
          onConflict: 'espn_event_id,provider_name'
        })

      if (error) {
        console.error('Failed to store odds:', error)
      }

      return NextResponse.json({
        success: true,
        eventId,
        cached: false,
        odds: oddsData
      })

    } catch (fetchError) {
      console.error('Error fetching odds:', fetchError)
      
      // Try to return stale cached odds as fallback
      const { data: staleOdds } = await supabase
        .from('game_odds')
        .select('*')
        .eq('espn_event_id', eventId)
        .order('last_updated', { ascending: false })
        .limit(1)

      if (staleOdds && staleOdds.length > 0) {
        return NextResponse.json({
          success: true,
          eventId,
          cached: true,
          stale: true,
          odds: staleOdds[0],
          warning: 'Odds may be outdated'
        })
      }

      return NextResponse.json({
        success: false,
        error: 'Failed to fetch odds and no cached data available'
      })
    }

  } catch (error) {
    console.error('Odds API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    })
  }
}