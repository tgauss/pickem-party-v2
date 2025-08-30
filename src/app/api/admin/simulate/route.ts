import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Team {
  key: string
  team_id: number
}

interface Game {
  id: string
  home_team_id: number
  away_team_id: number
  home_score: number | null
  away_score: number | null
  home_team: Team
  away_team: Team
}

interface GameResult {
  home_team_id: number
  away_team_id: number
  home_score: number | null
  away_score: number | null
  is_final: boolean
}

interface PickWithGame {
  id: string
  user_id: string
  team_id: number
  games: GameResult
}

export async function POST(request: Request) {
  try {
    const { action, week, leagueId } = await request.json()
    
    if (action === 'generate-picks') {
      return generatePicks(leagueId, week)
    } else if (action === 'process-week') {
      return processWeek(leagueId, week)
    } else if (action === 'simulate-weeks') {
      return simulateMultipleWeeks(leagueId, week) // week = target week
    }
    
    return NextResponse.json({ success: false, error: 'Invalid action' })
  } catch (error) {
    console.error('Simulation error:', error)
    return NextResponse.json({ success: false, error: 'Simulation failed' })
  }
}

async function generatePicks(leagueId: string, week: number) {
  // Get league members
  const { data: members } = await supabase
    .from('league_members')
    .select('user_id')
    .eq('league_id', leagueId)
    .eq('is_eliminated', false)

  if (!members || members.length === 0) {
    return NextResponse.json({ success: false, error: 'No active members found' })
  }

  // Get games for the week (using 2024 ESPN data)
  const { data: games } = await supabase
    .from('games')
    .select(`
      id,
      home_team_id,
      away_team_id,
      home_score,
      away_score,
      home_team:teams!games_home_team_id_fkey(key, team_id),
      away_team:teams!games_away_team_id_fkey(key, team_id)
    `)
    .eq('week', week)
    .eq('season_year', 2024)
    .not('espn_event_id', 'is', null)

  if (!games || games.length === 0) {
    return NextResponse.json({ success: false, error: 'No games found for week' })
  }

  // Type assertion with proper conversion
  const typedGames = games as unknown as Game[]

  // Get already used teams per player
  const { data: usedPicks } = await supabase
    .from('picks')
    .select('user_id, team_id')
    .eq('league_id', leagueId)
    .lt('week', week)

  const usedTeamsByUser = new Map()
  usedPicks?.forEach(pick => {
    if (!usedTeamsByUser.has(pick.user_id)) {
      usedTeamsByUser.set(pick.user_id, new Set())
    }
    usedTeamsByUser.get(pick.user_id).add(pick.team_id)
  })

  let generatedCount = 0

  for (const member of members) {
    // Get available teams (not used by this player)
    const usedTeams = usedTeamsByUser.get(member.user_id) || new Set()
    const availableGames = typedGames.filter(game => 
      game.home_team?.team_id && game.away_team?.team_id &&
      !usedTeams.has(game.home_team.team_id) && !usedTeams.has(game.away_team.team_id)
    )

    if (availableGames.length === 0) continue

    // Smart pick with some randomness: 70% chance to pick winner, 30% chance to pick randomly
    const shouldPickWinner = Math.random() < 0.7
    
    let selectedTeam, selectedGame
    
    if (shouldPickWinner) {
      // Find a game with a clear winner
      const gameWithWinner = availableGames.find(game => {
        if (game.home_score !== null && game.away_score !== null) {
          if (game.home_score > game.away_score) return true
          if (game.away_score > game.home_score) return true
        }
        return false
      }) || availableGames[0]
      
      if (gameWithWinner.home_score !== null && gameWithWinner.away_score !== null && gameWithWinner.home_score > gameWithWinner.away_score) {
        selectedTeam = gameWithWinner.home_team
        selectedGame = gameWithWinner
      } else {
        selectedTeam = gameWithWinner.away_team
        selectedGame = gameWithWinner
      }
    } else {
      // Pick randomly from available games
      const randomGame = availableGames[Math.floor(Math.random() * availableGames.length)]
      const pickHome = Math.random() < 0.5
      selectedTeam = pickHome ? randomGame.home_team : randomGame.away_team
      selectedGame = randomGame
    }

    // Create the pick (only if we have a valid team)
    if (selectedTeam?.team_id) {
      const { error } = await supabase
        .from('picks')
        .insert({
          user_id: member.user_id,
          league_id: leagueId,
          game_id: selectedGame.id,
          team_id: selectedTeam.team_id,
          week: week
        })

      if (!error) generatedCount++
    }
  }

  return NextResponse.json({ 
    success: true, 
    generated: generatedCount,
    message: `Generated ${generatedCount} picks for week ${week}`
  })
}

async function processWeek(leagueId: string, week: number) {
  // Get all picks for this week
  const { data: picks } = await supabase
    .from('picks')
    .select(`
      id,
      user_id,
      team_id,
      games!inner(
        home_team_id,
        away_team_id, 
        home_score,
        away_score,
        is_final
      )
    `)
    .eq('league_id', leagueId)
    .eq('week', week)

  if (!picks || picks.length === 0) {
    return NextResponse.json({ success: false, error: 'No picks found for week' })
  }

  let processedCount = 0

  // Type assertion with proper conversion
  const typedPicks = picks as unknown as PickWithGame[]
  
  for (const pick of typedPicks) {
    const game = pick.games
    if (!game?.is_final) continue

    const playerWon = game.home_score !== null && game.away_score !== null && (
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
      const { data: member } = await supabase
        .from('league_members')
        .select('lives_remaining')
        .eq('user_id', pick.user_id)
        .eq('league_id', leagueId)
        .single()

      if (member) {
        const newLives = member.lives_remaining - 1
        
        await supabase
          .from('league_members')
          .update({
            lives_remaining: newLives,
            is_eliminated: newLives <= 0,
            eliminated_week: newLives <= 0 ? week : null
          })
          .eq('user_id', pick.user_id)
          .eq('league_id', leagueId)
      }
    }

    processedCount++
  }

  return NextResponse.json({ 
    success: true, 
    processed: processedCount,
    message: `Processed ${processedCount} picks for week ${week}`
  })
}

async function simulateMultipleWeeks(leagueId: string, targetWeek: number) {
  let totalGenerated = 0
  let totalProcessed = 0

  for (let week = 1; week <= targetWeek; week++) {
    // Generate picks for the week
    const pickResult = await generatePicks(leagueId, week)
    if (pickResult instanceof Response) {
      const pickData = await pickResult.json()
      if (pickData.success) totalGenerated += pickData.generated
    }

    // Process the week results
    const processResult = await processWeek(leagueId, week)
    if (processResult instanceof Response) {
      const processData = await processResult.json()
      if (processData.success) totalProcessed += processData.processed
    }
  }

  return NextResponse.json({
    success: true,
    weeksSimulated: targetWeek,
    totalGenerated: totalGenerated,
    totalProcessed: totalProcessed,
    message: `Simulated ${targetWeek} weeks with ${totalGenerated} picks generated and ${totalProcessed} picks processed`
  })
}