require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function analyzeWeek7() {
  console.log('\n')
  console.log('='.repeat(80))
  console.log('📊 WEEK 7 CURRENT STATUS ANALYSIS')
  console.log('='.repeat(80))
  console.log('\n')

  // Get all Week 7 picks with full details
  const { data: picks } = await supabase
    .from('picks')
    .select(`
      *,
      user:users(id, display_name),
      picked_team:teams!picks_team_id_fkey(key, city, name, team_id),
      game:games(
        home_score,
        away_score,
        is_final,
        home_team_id,
        away_team_id,
        home_team:teams!games_home_team_id_fkey(key, city, name, team_id),
        away_team:teams!games_away_team_id_fkey(key, city, name, team_id)
      )
    `)
    .eq('week', 7)

  // Get current standings
  const { data: members } = await supabase
    .from('league_members')
    .select(`
      *,
      user:users(display_name)
    `)
    .order('lives_remaining', { ascending: false })

  console.log('📊 ALL WEEK 7 PICKS:\n')

  let correctCount = 0
  let incorrectCount = 0
  let unprocessedCount = 0
  let notFinalCount = 0

  const incorrectPicks = []
  const correctPicks = []

  picks.forEach(pick => {
    const game = pick.game
    const isGameFinal = game.is_final

    console.log(`${pick.user.display_name}: Picked ${pick.picked_team.key} (${pick.picked_team.city} ${pick.picked_team.name})`)

    if (!isGameFinal) {
      console.log(`   ⏳ Game not final yet`)
      console.log('')
      notFinalCount++
      return
    }

    // Game is final - determine winner
    const homeWon = game.home_score > game.away_score
    const awayWon = game.away_score > game.home_score
    const winningTeamId = homeWon ? game.home_team_id : game.away_team_id

    // Check if pick was correct
    const isCorrect = pick.team_id === winningTeamId

    const currentStatus = pick.is_correct === true ? '✅ MARKED CORRECT' :
                         pick.is_correct === false ? '❌ MARKED INCORRECT' :
                         '⏳ UNPROCESSED'

    const actualResult = isCorrect ? '✅ SHOULD BE CORRECT' : '❌ SHOULD BE INCORRECT'

    console.log(`   Final: ${game.away_team.key} ${game.away_score} @ ${game.home_team.key} ${game.home_score}`)
    console.log(`   Winner: ${homeWon ? game.home_team.key : game.away_team.key}`)
    console.log(`   Current DB: ${currentStatus}`)
    console.log(`   Actual: ${actualResult}`)

    if (isCorrect) {
      correctCount++
      correctPicks.push(pick)
    } else {
      incorrectCount++
      incorrectPicks.push(pick)
    }

    if (pick.is_correct === null) {
      unprocessedCount++
    }

    console.log('')
  })

  console.log('\n')
  console.log('='.repeat(80))
  console.log('📈 SUMMARY')
  console.log('='.repeat(80))
  console.log(`Total picks: ${picks.length}`)
  console.log(`Games not final: ${notFinalCount}`)
  console.log(`✅ Should be correct: ${correctCount}`)
  console.log(`❌ Should be incorrect: ${incorrectCount}`)
  console.log(`⏳ Unprocessed in DB: ${unprocessedCount}`)

  if (incorrectPicks.length > 0) {
    console.log('\n')
    console.log('='.repeat(80))
    console.log('❌ INCORRECT PICKS - WILL LOSE A LIFE')
    console.log('='.repeat(80))

    for (const pick of incorrectPicks) {
      const member = members.find(m => m.user.id === pick.user.id)
      const currentLives = member?.lives_remaining || 0
      const newLives = currentLives - 1
      const willBeEliminated = newLives <= 0

      console.log(`\n💀 ${pick.user.display_name}`)
      console.log(`   Picked: ${pick.picked_team.city} ${pick.picked_team.name}`)
      console.log(`   Current lives: ${currentLives}`)
      console.log(`   Lives after: ${Math.max(0, newLives)}`)
      if (willBeEliminated) {
        console.log(`   💀💀💀 WILL BE ELIMINATED 💀💀💀`)
      } else {
        console.log(`   ⚠️  Will be down to ${newLives} life!`)
      }
    }
  }

  console.log('\n')
  console.log('='.repeat(80))
  console.log('📋 CURRENT STANDINGS (BEFORE WEEK 7 SETTLEMENT)')
  console.log('='.repeat(80))

  const alive = members.filter(m => !m.is_eliminated)
  const eliminated = members.filter(m => m.is_eliminated)
  const twoLives = alive.filter(m => m.lives_remaining === 2)
  const oneLife = alive.filter(m => m.lives_remaining === 1)

  console.log(`\n🟢 ALIVE: ${alive.length} players`)

  if (twoLives.length > 0) {
    console.log(`\n   💚💚 2 Lives (${twoLives.length} players):`)
    twoLives.forEach(m => console.log(`      ${m.user.display_name}`))
  }

  if (oneLife.length > 0) {
    console.log(`\n   💚 1 Life (${oneLife.length} players):`)
    oneLife.forEach(m => console.log(`      ${m.user.display_name}`))
  }

  if (eliminated.length > 0) {
    console.log(`\n💀 ELIMINATED: ${eliminated.length} players`)
    eliminated.forEach(m => console.log(`      ${m.user.display_name} (Week ${m.eliminated_week})`))
  }

  // Projected standings
  console.log('\n')
  console.log('='.repeat(80))
  console.log('🔮 PROJECTED STANDINGS (AFTER WEEK 7 SETTLEMENT)')
  console.log('='.repeat(80))

  const projectedMembers = members.map(m => {
    const hasIncorrectPick = incorrectPicks.some(p => p.user.id === m.user.id)
    if (hasIncorrectPick && !m.is_eliminated) {
      const newLives = m.lives_remaining - 1
      return {
        ...m,
        lives_remaining: Math.max(0, newLives),
        is_eliminated: newLives <= 0,
        eliminated_week: newLives <= 0 ? 7 : m.eliminated_week
      }
    }
    return m
  })

  const projectedAlive = projectedMembers.filter(m => !m.is_eliminated)
  const projectedEliminated = projectedMembers.filter(m => m.is_eliminated)
  const projectedTwoLives = projectedAlive.filter(m => m.lives_remaining === 2)
  const projectedOneLife = projectedAlive.filter(m => m.lives_remaining === 1)

  console.log(`\n🟢 ALIVE: ${projectedAlive.length} players`)

  if (projectedTwoLives.length > 0) {
    console.log(`\n   💚💚 2 Lives (${projectedTwoLives.length} players):`)
    projectedTwoLives.forEach(m => console.log(`      ${m.user.display_name}`))
  }

  if (projectedOneLife.length > 0) {
    console.log(`\n   💚 1 Life (${projectedOneLife.length} players):`)
    projectedOneLife.forEach(m => console.log(`      ${m.user.display_name}`))
  }

  if (projectedEliminated.length > 0) {
    console.log(`\n💀 ELIMINATED: ${projectedEliminated.length} players`)
    projectedEliminated.forEach(m => {
      const newlyEliminated = m.eliminated_week === 7 ? ' 🆕 NEW!' : ''
      console.log(`      ${m.user.display_name} (Week ${m.eliminated_week})${newlyEliminated}`)
    })
  }

  console.log('\n')
  console.log('='.repeat(80))
  console.log('END OF ANALYSIS')
  console.log('='.repeat(80))
  console.log('\n')
}

analyzeWeek7().catch(console.error)
