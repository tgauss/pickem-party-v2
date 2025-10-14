require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function generateWeek6Report() {
  console.log('🏈 WEEK 6 PICKS & RESULTS REPORT')
  console.log('=' .repeat(80))
  console.log('\n')

  // Get all picks with results
  const { data: picks } = await supabase
    .from('picks')
    .select(`
      *,
      user:users(id, display_name),
      picked_team:teams!picks_team_id_fkey(city, name, team_id),
      game:games(
        id,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        is_final,
        game_time,
        home_team:teams!games_home_team_id_fkey(city, name),
        away_team:teams!games_away_team_id_fkey(city, name)
      )
    `)
    .eq('week', 6)
    .order('submitted_at', { ascending: true })

  // Get league members with lives
  const { data: members } = await supabase
    .from('league_members')
    .select(`
      *,
      user:users(id, display_name)
    `)
    .order('lives_remaining', { ascending: false })

  const correctPicks = picks?.filter(p => p.is_correct === true) || []
  const incorrectPicks = picks?.filter(p => p.is_correct === false) || []
  const pendingPicks = picks?.filter(p => p.is_correct === null) || []

  console.log('📊 SUMMARY:')
  console.log(`   Total Picks: ${picks?.length || 0}`)
  console.log(`   ✅ Correct: ${correctPicks.length}`)
  console.log(`   ❌ Incorrect: ${incorrectPicks.length}`)
  console.log(`   ⏳ Pending: ${pendingPicks.length}`)
  console.log('')

  if (correctPicks.length > 0) {
    console.log('✅ CORRECT PICKS (Safe for now):')
    correctPicks.forEach(pick => {
      const game = pick.game
      console.log(`   ${pick.user.display_name} picked ${pick.picked_team.city} ${pick.picked_team.name}`)
      console.log(`      Game: ${game.away_team.city} ${game.away_score} @ ${game.home_team.city} ${game.home_score} ✅ FINAL`)
    })
    console.log('')
  }

  if (incorrectPicks.length > 0) {
    console.log('❌ INCORRECT PICKS (Lost a life):')
    incorrectPicks.forEach(pick => {
      const game = pick.game
      console.log(`   ${pick.user.display_name} picked ${pick.picked_team.city} ${pick.picked_team.name}`)
      console.log(`      Game: ${game.away_team.city} ${game.away_score} @ ${game.home_team.city} ${game.home_score} ❌ LOST`)
    })
    console.log('')
  }

  if (pendingPicks.length > 0) {
    console.log('⏳ PENDING PICKS (Games not finished):')
    pendingPicks.forEach(pick => {
      const game = pick.game
      const status = game.is_final ? 'FINAL' : (game.home_score !== null ? 'In Progress' : 'Scheduled')
      const score = game.home_score !== null ? `${game.away_score}-${game.home_score}` : 'Not Started'
      console.log(`   ${pick.user.display_name} picked ${pick.picked_team.city} ${pick.picked_team.name}`)
      console.log(`      Game: ${game.away_team.city} @ ${game.home_team.city} [${score}] - ${status}`)
    })
    console.log('')
  }

  // Check who hasn't picked yet
  const userIdsWithPicks = new Set(picks?.map(p => p.user.id) || [])
  const membersWithoutPicks = members?.filter(m => !m.is_eliminated && !userIdsWithPicks.has(m.user.id)) || []

  if (membersWithoutPicks.length > 0) {
    console.log('⚠️  NO PICK SUBMITTED:')
    membersWithoutPicks.forEach(m => {
      console.log(`   ${m.user.display_name} (Lives: ${m.lives_remaining}) - NO PICK YET`)
    })
    console.log('')
  }

  console.log('=' .repeat(80))
  console.log('\n💡 Note: Incorrect picks will lose a life when we process final results.')
  console.log('💡 Games still in progress may change these results.\n')
}

generateWeek6Report().catch(console.error)
