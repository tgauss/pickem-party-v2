require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function syncAndSettleWeek7() {
  console.log('\n')
  console.log('='.repeat(80))
  console.log('🏈 SYNC AND SETTLE WEEK 7 - THE GRIDIRON GAMBLE 2025')
  console.log('='.repeat(80))
  console.log('\n')

  // STEP 1: Sync all Week 7 scores from ESPN
  console.log('📡 STEP 1: Syncing Week 7 scores from ESPN...\n')
  await syncWeek7Scores()

  // STEP 2: Process all pick results
  console.log('\n📋 STEP 2: Processing all Week 7 pick results...\n')
  await processAllPickResults()

  // STEP 3: Deduct lives and handle eliminations
  console.log('\n💔 STEP 3: Deducting lives for incorrect picks...\n')
  await deductLivesAndEliminate()

  // STEP 4: Generate final recap
  console.log('\n📊 STEP 4: Generating final Week 7 recap...\n')
  await generateFinalRecap()

  console.log('\n')
  console.log('='.repeat(80))
  console.log('✅ WEEK 7 SETTLEMENT COMPLETE!')
  console.log('='.repeat(80))
  console.log('\n')
}

async function syncWeek7Scores() {
  const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=7&seasontype=2&dates=2025', {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; PickemParty/2.0)'
    }
  })

  const data = await response.json()
  const events = data.events || []

  console.log(`Found ${events.length} games from ESPN`)

  const { data: teams } = await supabase.from('teams').select('*')
  const teamMap = new Map()
  teams?.forEach(team => {
    teamMap.set(team.key, team.team_id)
  })

  let updatedCount = 0

  for (const event of events) {
    const comp = event.competitions[0]
    const home = comp.competitors.find(c => c.homeAway === 'home')
    const away = comp.competitors.find(c => c.homeAway === 'away')

    const homeTeamId = teamMap.get(home.team.abbreviation)
    const awayTeamId = teamMap.get(away.team.abbreviation)

    if (!homeTeamId || !awayTeamId) continue

    const homeScore = parseInt(home.score || '0')
    const awayScore = parseInt(away.score || '0')
    const isFinal = event.status.type.completed

    const { data: existingGame } = await supabase
      .from('games')
      .select('id, is_final')
      .eq('home_team_id', homeTeamId)
      .eq('away_team_id', awayTeamId)
      .eq('season_year', 2025)
      .eq('week', 7)
      .single()

    if (!existingGame) continue

    const { error } = await supabase
      .from('games')
      .update({
        home_score: homeScore,
        away_score: awayScore,
        is_final: isFinal
      })
      .eq('id', existingGame.id)

    if (!error) {
      updatedCount++
      const status = existingGame.is_final ? '(already final)' : '✨ UPDATED'
      console.log(`   ${away.team.abbreviation} ${awayScore} @ ${home.team.abbreviation} ${homeScore} - FINAL ${status}`)
    }
  }

  console.log(`\n✅ Updated ${updatedCount} games`)
}

async function processAllPickResults() {
  const { data: games } = await supabase
    .from('games')
    .select(`
      id,
      home_team_id,
      away_team_id,
      home_score,
      away_score,
      home_team:teams!games_home_team_id_fkey(key, city, name),
      away_team:teams!games_away_team_id_fkey(key, city, name)
    `)
    .eq('season_year', 2025)
    .eq('week', 7)
    .eq('is_final', true)

  console.log(`Processing ${games.length} final games`)

  let picksProcessed = 0

  for (const game of games) {
    const winningTeamId = game.home_score > game.away_score ? game.home_team_id : game.away_team_id

    const { data: gamePicks } = await supabase
      .from('picks')
      .select(`
        id,
        team_id,
        is_correct,
        user:users(display_name),
        picked_team:teams!picks_team_id_fkey(key, city, name)
      `)
      .eq('game_id', game.id)

    if (!gamePicks || gamePicks.length === 0) continue

    for (const pick of gamePicks) {
      const isCorrect = pick.team_id === winningTeamId

      if (pick.is_correct === null || pick.is_correct !== isCorrect) {
        const { error } = await supabase
          .from('picks')
          .update({ is_correct: isCorrect })
          .eq('id', pick.id)

        if (!error) {
          picksProcessed++
          const result = isCorrect ? '✅' : '❌'
          console.log(`   ${result} ${pick.user.display_name}: ${pick.picked_team.key} (${isCorrect ? 'CORRECT' : 'INCORRECT'})`)
        }
      }
    }
  }

  console.log(`\n✅ Processed ${picksProcessed} pick results`)
}

async function deductLivesAndEliminate() {
  const { data: incorrectPicks } = await supabase
    .from('picks')
    .select(`
      *,
      user:users(id, display_name),
      picked_team:teams!picks_team_id_fkey(city, name),
      game:games(
        home_score,
        away_score,
        home_team:teams!games_home_team_id_fkey(city, name),
        away_team:teams!games_away_team_id_fkey(city, name)
      )
    `)
    .eq('week', 7)
    .eq('is_correct', false)

  if (!incorrectPicks || incorrectPicks.length === 0) {
    console.log('✅ No incorrect picks - everyone survived!')
    return
  }

  console.log(`Found ${incorrectPicks.length} incorrect pick(s)\n`)

  let eliminationCount = 0
  let livesDeducted = 0

  for (const pick of incorrectPicks) {
    const { data: member } = await supabase
      .from('league_members')
      .select('*')
      .eq('user_id', pick.user.id)
      .single()

    if (!member) continue

    const game = pick.game
    console.log(`💀 ${pick.user.display_name}`)
    console.log(`   Picked: ${pick.picked_team.city} ${pick.picked_team.name}`)
    console.log(`   Result: ${game.away_team.city} ${game.away_score} @ ${game.home_team.city} ${game.home_score}`)
    console.log(`   Lives Before: ${member.lives_remaining}`)

    const newLives = member.lives_remaining - 1
    const isEliminated = newLives <= 0

    const { error } = await supabase
      .from('league_members')
      .update({
        lives_remaining: Math.max(0, newLives),
        is_eliminated: isEliminated,
        eliminated_week: isEliminated ? 7 : member.eliminated_week
      })
      .eq('id', member.id)

    if (!error) {
      livesDeducted++
      console.log(`   Lives After: ${Math.max(0, newLives)}`)
      if (isEliminated) {
        eliminationCount++
        console.log(`   💀💀💀 ELIMINATED FROM THE GRIDIRON GAMBLE 💀💀💀`)
      } else {
        console.log(`   ⚠️  Down to ${newLives} life remaining!`)
      }
    }
    console.log('')
  }

  console.log(`✅ Deducted ${livesDeducted} lives`)
  console.log(`💀 New eliminations: ${eliminationCount}`)
}

async function generateFinalRecap() {
  const { data: picks } = await supabase
    .from('picks')
    .select(`
      *,
      user:users(display_name),
      picked_team:teams!picks_team_id_fkey(key, city, name)
    `)
    .eq('week', 7)

  const { data: members } = await supabase
    .from('league_members')
    .select(`
      *,
      user:users(display_name)
    `)
    .order('lives_remaining', { ascending: false })

  const correctPicks = picks?.filter(p => p.is_correct === true) || []
  const incorrectPicks = picks?.filter(p => p.is_correct === false) || []
  const alive = members?.filter(m => !m.is_eliminated) || []
  const eliminated = members?.filter(m => m.is_eliminated) || []
  const newlyEliminated = eliminated.filter(m => m.eliminated_week === 7)
  const twoLives = alive.filter(m => m.lives_remaining === 2)
  const oneLife = alive.filter(m => m.lives_remaining === 1)

  console.log('='.repeat(80))
  console.log('📊 WEEK 7 FINAL STATISTICS')
  console.log('='.repeat(80))
  console.log(`Total Picks: ${picks?.length || 0}`)
  console.log(`✅ Correct: ${correctPicks.length} (${((correctPicks.length / picks.length) * 100).toFixed(1)}%)`)
  console.log(`❌ Incorrect: ${incorrectPicks.length} (${((incorrectPicks.length / picks.length) * 100).toFixed(1)}%)`)

  // Most popular correct pick
  const pickCounts = {}
  correctPicks.forEach(pick => {
    const key = pick.picked_team.key
    pickCounts[key] = (pickCounts[key] || 0) + 1
  })
  const sortedPicks = Object.entries(pickCounts).sort((a, b) => b[1] - a[1])
  if (sortedPicks.length > 0) {
    const [teamKey, count] = sortedPicks[0]
    const teamInfo = correctPicks.find(p => p.picked_team.key === teamKey)?.picked_team
    console.log(`🔥 Most Popular: ${teamInfo?.city} ${teamInfo?.name} (${count} players)`)
  }

  console.log('\n')
  console.log('='.repeat(80))
  console.log('📋 FINAL STANDINGS AFTER WEEK 7')
  console.log('='.repeat(80))
  console.log(`\n🟢 ALIVE: ${alive.length} players`)

  if (twoLives.length > 0) {
    console.log(`\n💚💚 2 Lives (${twoLives.length} players):`)
    twoLives.forEach(m => console.log(`   ${m.user.display_name}`))
  }

  if (oneLife.length > 0) {
    console.log(`\n💚 1 Life (${oneLife.length} players - DANGER ZONE!):`)
    oneLife.forEach(m => console.log(`   ${m.user.display_name}`))
  }

  if (eliminated.length > 0) {
    console.log(`\n💀 ELIMINATED: ${eliminated.length} players`)
    if (newlyEliminated.length > 0) {
      console.log(`\n   🆕 NEW THIS WEEK (${newlyEliminated.length}):`)
      newlyEliminated.forEach(m => console.log(`      ${m.user.display_name}`))
    }
    const previouslyEliminated = eliminated.filter(m => m.eliminated_week !== 7)
    if (previouslyEliminated.length > 0) {
      console.log(`\n   Previous weeks:`)
      previouslyEliminated.forEach(m => console.log(`      ${m.user.display_name} (Week ${m.eliminated_week})`))
    }
  }

  console.log('\n')
  console.log('🏆 KEY MOMENTS')
  console.log('-'.repeat(80))
  console.log(`• KC Chiefs dominated LV Raiders 31-0 (9 players picked KC!)`)
  console.log(`• Pittsburgh upset: Steelers lost 31-33 to Bengals (4 players affected)`)
  console.log(`• ${newlyEliminated.length} player(s) eliminated this week`)
  console.log(`• ${alive.length} fighters remain!`)
}

syncAndSettleWeek7().catch(console.error)
