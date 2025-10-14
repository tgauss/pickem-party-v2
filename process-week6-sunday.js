require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function processWeek6Sunday() {
  console.log('🏈 Processing Week 6 Sunday Games (October 12, 2025)\n')
  console.log('=' .repeat(80))

  // 1. Fetch all Week 6 games from ESPN data
  const { data: espnGames, error: espnError } = await supabase
    .from('espn_games_raw')
    .select('*')
    .eq('week', 6)
    .eq('season_year', 2025)
    .order('game_date', { ascending: true })

  if (espnError) {
    console.error('❌ Error fetching ESPN games:', espnError)
    return
  }

  console.log(`\n📊 Found ${espnGames.length} Week 6 games in ESPN data\n`)

  // 2. Get today's date range (Oct 12, 2025)
  const todayStart = new Date('2025-10-12T00:00:00Z')
  const todayEnd = new Date('2025-10-12T23:59:59Z')

  const completedGamesToday = espnGames.filter(game => {
    const gameDate = new Date(game.game_date)
    return gameDate >= todayStart && gameDate <= todayEnd && game.is_completed
  })

  console.log(`\n✅ Completed games today: ${completedGamesToday.length}\n`)

  if (completedGamesToday.length === 0) {
    console.log('No completed games yet today.')

    // Show all games today with their status
    const allGamesToday = espnGames.filter(game => {
      const gameDate = new Date(game.game_date)
      return gameDate >= todayStart && gameDate <= todayEnd
    })

    console.log('\n📅 All Week 6 games scheduled for today:')
    allGamesToday.forEach(game => {
      const status = game.is_completed ? '✅ FINAL' : `⏳ ${game.game_status}`
      console.log(`\n   ${status}`)
      console.log(`   ${game.away_team_name} ${game.away_score || 0} @ ${game.home_team_name} ${game.home_score || 0}`)
      console.log(`   ${new Date(game.game_date).toLocaleTimeString()}`)
    })
    return
  }

  // 3. Process each completed game
  for (const espnGame of completedGamesToday) {
    console.log('\n' + '─'.repeat(80))
    console.log(`\n🏈 ${espnGame.away_team_name} ${espnGame.away_score} @ ${espnGame.home_team_name} ${espnGame.home_score}`)
    console.log(`   Status: ${espnGame.game_status}`)
    console.log(`   ESPN Event ID: ${espnGame.espn_event_id}`)

    // Determine winner
    const homeWon = espnGame.home_score > espnGame.away_score
    const awayWon = espnGame.away_score > espnGame.home_score
    const winningTeamId = homeWon ? espnGame.home_team_id : espnGame.away_team_id

    console.log(`   Winner: ${homeWon ? espnGame.home_team_name : espnGame.away_team_name} (Team ID: ${winningTeamId})`)

    // 4. Find corresponding game in games table
    const { data: games, error: gameError } = await supabase
      .from('games')
      .select(`
        *,
        home_team:teams!games_home_team_id_fkey(city, name),
        away_team:teams!games_away_team_id_fkey(city, name)
      `)
      .eq('week', 6)
      .eq('season_year', 2025)
      .eq('home_team_id', espnGame.home_team_id)
      .eq('away_team_id', espnGame.away_team_id)
      .single()

    if (gameError || !games) {
      console.log(`   ⚠️  Game not found in games table`)
      continue
    }

    console.log(`   Game ID: ${games.id}`)

    // 5. Update game scores
    const { error: updateError } = await supabase
      .from('games')
      .update({
        home_score: espnGame.home_score,
        away_score: espnGame.away_score,
        is_final: true,
        game_status: espnGame.game_status,
        last_updated: new Date().toISOString()
      })
      .eq('id', games.id)

    if (updateError) {
      console.log(`   ❌ Error updating game scores:`, updateError)
      continue
    }

    console.log(`   ✅ Game scores updated`)

    // 6. Find all picks for this game
    const { data: picks, error: picksError } = await supabase
      .from('picks')
      .select(`
        *,
        user:users(username, display_name),
        league:leagues(name),
        picked_team:teams!picks_team_id_fkey(city, name, team_id)
      `)
      .eq('game_id', games.id)
      .eq('week', 6)

    if (picksError) {
      console.log(`   ❌ Error fetching picks:`, picksError)
      continue
    }

    if (!picks || picks.length === 0) {
      console.log(`   📋 No picks found for this game`)
      continue
    }

    console.log(`\n   📋 Processing ${picks.length} pick(s):`)

    // 7. Update each pick with is_correct status
    for (const pick of picks) {
      const isCorrect = pick.team_id === winningTeamId
      const resultIcon = isCorrect ? '✅' : '❌'

      console.log(`\n      ${resultIcon} ${pick.user.display_name} picked ${pick.picked_team.city} ${pick.picked_team.name}`)
      console.log(`         Result: ${isCorrect ? 'CORRECT' : 'INCORRECT'}`)

      // Update pick
      const { error: updatePickError } = await supabase
        .from('picks')
        .update({ is_correct: isCorrect })
        .eq('id', pick.id)

      if (updatePickError) {
        console.log(`         ⚠️  Error updating pick:`, updatePickError)
      } else {
        console.log(`         ✅ Pick updated`)
      }
    }
  }

  // 8. Show summary of all Week 6 picks
  console.log('\n\n' + '='.repeat(80))
  console.log('\n📊 WEEK 6 PICKS SUMMARY\n')

  const { data: allPicks, error: allPicksError } = await supabase
    .from('picks')
    .select(`
      *,
      user:users(username, display_name),
      game:games(
        id,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        is_final,
        home_team:teams!games_home_team_id_fkey(city, name),
        away_team:teams!games_away_team_id_fkey(city, name)
      ),
      picked_team:teams!picks_team_id_fkey(city, name, team_id)
    `)
    .eq('week', 6)
    .order('submitted_at', { ascending: true })

  if (allPicksError || !allPicks) {
    console.error('❌ Error fetching all picks:', allPicksError)
    return
  }

  const correctPicks = allPicks.filter(p => p.is_correct === true)
  const incorrectPicks = allPicks.filter(p => p.is_correct === false)
  const pendingPicks = allPicks.filter(p => p.is_correct === null)

  console.log(`Total Picks: ${allPicks.length}`)
  console.log(`✅ Correct: ${correctPicks.length}`)
  console.log(`❌ Incorrect: ${incorrectPicks.length}`)
  console.log(`⏳ Pending: ${pendingPicks.length}\n`)

  if (correctPicks.length > 0) {
    console.log('\n✅ CORRECT PICKS:')
    correctPicks.forEach(pick => {
      console.log(`   ${pick.user.display_name} - ${pick.picked_team.city} ${pick.picked_team.name}`)
    })
  }

  if (incorrectPicks.length > 0) {
    console.log('\n❌ INCORRECT PICKS:')
    incorrectPicks.forEach(pick => {
      console.log(`   ${pick.user.display_name} - ${pick.picked_team.city} ${pick.picked_team.name}`)
    })
  }

  if (pendingPicks.length > 0) {
    console.log('\n⏳ PENDING PICKS (games not finished):')
    pendingPicks.forEach(pick => {
      const game = pick.game
      const status = game.is_final ? 'Final' : 'In Progress'
      console.log(`   ${pick.user.display_name} - ${pick.picked_team.city} ${pick.picked_team.name}`)
      console.log(`      Game: ${game.away_team.city} @ ${game.home_team.city} [${status}]`)
    })
  }

  console.log('\n' + '='.repeat(80))
  console.log('\n🎉 Processing complete!\n')
}

processWeek6Sunday().catch(console.error)
