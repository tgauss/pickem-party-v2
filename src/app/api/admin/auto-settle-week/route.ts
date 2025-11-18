import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const LEAGUE_ID = 'ce87e7df-2aa1-460e-b48f-0f2c0a905643' // The Gridiron Gamble 2025

interface SettlementResult {
  success: boolean
  week: number
  scoresSynced: number
  gamesProcessed: number
  picksProcessed: number
  lifeDeductions: number
  eliminations: string[]
  errors: string[]
  message: string
  timestamp: string
}

/**
 * Auto-settlement API route
 * Can be triggered by:
 * 1. Cron job (Vercel, GitHub Actions)
 * 2. Manual API call with secret token
 *
 * POST /api/admin/auto-settle-week
 * Headers: { "x-cron-secret": "your-secret-token" }
 * Body: { "week": 11, "dryRun": false } (optional)
 */
export async function POST(request: NextRequest) {
  try {
    // Security: Verify cron secret
    const cronSecret = request.headers.get('x-cron-secret')
    const expectedSecret = process.env.CRON_SECRET || 'pickem-party-cron-2025'

    if (cronSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body (optional)
    let body: { week?: number; dryRun?: boolean } = {}
    try {
      body = await request.json()
    } catch {
      // No body or invalid JSON - use defaults
    }

    const dryRun = body.dryRun ?? false

    // Determine current week
    const currentWeek = body.week || await getCurrentWeek()

    console.log(`[AUTO-SETTLE] Starting settlement for Week ${currentWeek}${dryRun ? ' (DRY RUN)' : ''}`)

    const result = await settleWeek(currentWeek, dryRun)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[AUTO-SETTLE] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * Determine the current NFL week based on date and schedule
 */
async function getCurrentWeek(): Promise<number> {
  // Get the most recent week with games
  const { data: games } = await supabase
    .from('games')
    .select('week')
    .eq('season_year', 2025)
    .order('game_time', { ascending: false })
    .limit(1)

  if (games && games.length > 0) {
    return games[0].week
  }

  // Fallback: calculate based on season start
  const seasonStart = new Date('2025-09-04') // Week 1 start
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24))
  const week = Math.floor(diffDays / 7) + 1
  return Math.max(1, Math.min(18, week))
}

/**
 * Sync scores from ESPN API for a given week
 * This ensures Monday night games are updated before settlement
 */
async function syncScoresFromESPN(week: number): Promise<number> {
  try {
    console.log(`[AUTO-SETTLE] Syncing scores from ESPN for Week ${week}`)

    // Fetch scores from ESPN API
    const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&seasontype=2&year=2025`
    const response = await fetch(espnUrl)

    if (!response.ok) {
      console.error(`[AUTO-SETTLE] ESPN API error: ${response.status}`)
      return 0
    }

    const data = await response.json()
    let updatedCount = 0

    // Process each game from ESPN
    for (const event of data.events || []) {
      const competition = event.competitions?.[0]
      if (!competition) continue

      const status = competition.status?.type
      const isCompleted = status?.completed === true

      // Get team abbreviations
      const competitors = competition.competitors || []
      const awayTeam = competitors.find((c: { homeAway: string }) => c.homeAway === 'away')
      const homeTeam = competitors.find((c: { homeAway: string }) => c.homeAway === 'home')

      if (!awayTeam || !homeTeam) continue

      const awayKey = awayTeam.team?.abbreviation
      const homeKey = homeTeam.team?.abbreviation
      const awayScore = parseInt(awayTeam.score || '0')
      const homeScore = parseInt(homeTeam.score || '0')

      // Find matching game in our database
      const { data: dbGames } = await supabase
        .from('games')
        .select(`
          id,
          away_score,
          home_score,
          is_final,
          away_team:teams!games_away_team_id_fkey(key),
          home_team:teams!games_home_team_id_fkey(key)
        `)
        .eq('week', week)
        .eq('season_year', 2025)

      const matchingGame = dbGames?.find(
        (g: { away_team: { key: string }; home_team: { key: string } }) =>
          g.away_team.key === awayKey && g.home_team.key === homeKey
      )

      if (!matchingGame) continue

      // Update if score changed or game became final
      const scoreChanged =
        matchingGame.away_score !== awayScore ||
        matchingGame.home_score !== homeScore
      const statusChanged = !matchingGame.is_final && isCompleted

      if (scoreChanged || statusChanged) {
        const { error } = await supabase
          .from('games')
          .update({
            away_score: awayScore,
            home_score: homeScore,
            is_final: isCompleted,
            game_status: status?.description || 'Unknown',
            last_updated: new Date().toISOString()
          })
          .eq('id', matchingGame.id)

        if (!error) {
          updatedCount++
          console.log(`[AUTO-SETTLE] Updated ${awayKey} @ ${homeKey}: ${awayScore}-${homeScore} ${isCompleted ? 'FINAL' : ''}`)
        }
      }
    }

    console.log(`[AUTO-SETTLE] Synced ${updatedCount} games from ESPN`)
    return updatedCount
  } catch (error) {
    console.error('[AUTO-SETTLE] Error syncing scores:', error)
    return 0
  }
}

/**
 * Main settlement logic for a given week
 */
async function settleWeek(week: number, dryRun: boolean): Promise<SettlementResult> {
  const result: SettlementResult = {
    success: false,
    week,
    scoresSynced: 0,
    gamesProcessed: 0,
    picksProcessed: 0,
    lifeDeductions: 0,
    eliminations: [],
    errors: [],
    message: '',
    timestamp: new Date().toISOString()
  }

  try {
    // Step 0: Sync latest scores from ESPN first
    if (!dryRun) {
      result.scoresSynced = await syncScoresFromESPN(week)
    }

    // Step 1: Check if all games are final
    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select(`
        *,
        home_team:teams!games_home_team_id_fkey(key, name),
        away_team:teams!games_away_team_id_fkey(key, name)
      `)
      .eq('season_year', 2025)
      .eq('week', week)
      .order('game_time')

    if (gamesError) {
      result.errors.push(`Failed to fetch games: ${gamesError.message}`)
      return result
    }

    if (!games || games.length === 0) {
      result.errors.push(`No games found for Week ${week}`)
      return result
    }

    const incompletGames = games.filter(g => !g.is_final)
    if (incompletGames.length > 0) {
      result.message = `Week ${week} not ready: ${incompletGames.length} games still in progress`
      result.errors.push(
        ...incompletGames.map(g => `${g.away_team.key} @ ${g.home_team.key}`)
      )
      return result
    }

    console.log(`[AUTO-SETTLE] All ${games.length} Week ${week} games are final`)
    result.gamesProcessed = games.length

    // Step 2: Get all picks for this week
    const { data: picks, error: picksError } = await supabase
      .from('picks')
      .select(`
        *,
        users(id, username, display_name),
        teams(team_id, key, city, name),
        games(
          id,
          home_team_id,
          away_team_id,
          home_score,
          away_score,
          is_final
        )
      `)
      .eq('league_id', LEAGUE_ID)
      .eq('week', week)

    if (picksError) {
      result.errors.push(`Failed to fetch picks: ${picksError.message}`)
      return result
    }

    if (!picks || picks.length === 0) {
      result.message = `No picks found for Week ${week}`
      return result
    }

    console.log(`[AUTO-SETTLE] Processing ${picks.length} picks`)

    // Step 3: Process each pick and mark as correct/incorrect
    const incorrectPicks = []

    for (const pick of picks) {
      const game = pick.games

      if (!game || !game.is_final) {
        result.errors.push(`Pick ${pick.id} has no final game`)
        continue
      }

      // Determine if pick was correct
      const isHome = pick.team_id === game.home_team_id
      const homeWon = game.home_score > game.away_score
      const awayWon = game.away_score > game.home_score
      const isTie = game.home_score === game.away_score

      let isCorrect = false
      if (isTie) {
        isCorrect = false // Ties count as losses
      } else if (isHome && homeWon) {
        isCorrect = true
      } else if (!isHome && awayWon) {
        isCorrect = true
      }

      // Update pick result (if not already processed)
      if (pick.is_correct === null) {
        if (!dryRun) {
          const { error: updateError } = await supabase
            .from('picks')
            .update({ is_correct: isCorrect })
            .eq('id', pick.id)

          if (updateError) {
            result.errors.push(`Failed to update pick ${pick.id}: ${updateError.message}`)
            continue
          }
        }

        result.picksProcessed++
        console.log(`[AUTO-SETTLE] ${pick.users.display_name}: ${pick.teams.key} = ${isCorrect ? 'WIN' : 'LOSS'}`)
      }

      // Track incorrect picks for life deduction
      if (!isCorrect) {
        incorrectPicks.push(pick)
      }
    }

    // Step 4: Apply life deductions
    for (const pick of incorrectPicks) {
      const { data: member, error: memberError } = await supabase
        .from('league_members')
        .select('*')
        .eq('league_id', LEAGUE_ID)
        .eq('user_id', pick.users.id)
        .single()

      if (memberError || !member) {
        result.errors.push(`Failed to find member for ${pick.users.display_name}`)
        continue
      }

      const newLives = Math.max(0, member.lives_remaining - 1)
      const willBeEliminated = newLives === 0

      if (!dryRun) {
        const updateData: {
          lives_remaining: number
          is_eliminated?: boolean
          eliminated_week?: number
        } = {
          lives_remaining: newLives
        }

        if (willBeEliminated && !member.is_eliminated) {
          updateData.is_eliminated = true
          updateData.eliminated_week = week
        }

        const { error: updateError } = await supabase
          .from('league_members')
          .update(updateData)
          .eq('league_id', LEAGUE_ID)
          .eq('user_id', pick.users.id)

        if (updateError) {
          result.errors.push(`Failed to update member ${pick.users.display_name}: ${updateError.message}`)
          continue
        }
      }

      result.lifeDeductions++
      console.log(`[AUTO-SETTLE] ${pick.users.display_name}: ${member.lives_remaining} → ${newLives} lives${willBeEliminated ? ' (ELIMINATED)' : ''}`)

      if (willBeEliminated) {
        result.eliminations.push(pick.users.display_name)
      }
    }

    // Success!
    result.success = true
    result.message = dryRun
      ? `Dry run complete: Would sync ${result.scoresSynced} scores, process ${result.picksProcessed} picks, ${result.lifeDeductions} life deductions, ${result.eliminations.length} eliminations`
      : `Week ${week} settled: ${result.scoresSynced} scores synced, ${result.picksProcessed} picks processed, ${result.lifeDeductions} life deductions, ${result.eliminations.length} eliminations`

    console.log(`[AUTO-SETTLE] ${result.message}`)

    return result
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    return result
  }
}

/**
 * GET endpoint for testing/status check
 */
export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret')
  const expectedSecret = process.env.CRON_SECRET || 'pickem-party-cron-2025'

  if (cronSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const currentWeek = await getCurrentWeek()

  return NextResponse.json({
    status: 'ready',
    currentWeek,
    timestamp: new Date().toISOString(),
    message: 'Auto-settlement endpoint is active'
  })
}
