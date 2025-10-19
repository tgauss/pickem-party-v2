// Verify Week 6 Settlement and Open Week 7
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyWeek6AndOpenWeek7() {
  console.log('🔍 VERIFYING WEEK 6 SETTLEMENT...\n')

  // 1. Check Week 6 games
  const { data: week6Games, error: gamesError } = await supabase
    .from('games')
    .select('*')
    .eq('season_year', 2025)
    .eq('week', 6)
    .order('game_time')

  if (gamesError) {
    console.error('Error fetching Week 6 games:', gamesError)
    return
  }

  console.log(`📊 WEEK 6 GAMES (${week6Games.length} total):`)
  const finalGames = week6Games.filter(g => g.status === 'STATUS_FINAL')
  const pendingGames = week6Games.filter(g => g.status !== 'STATUS_FINAL')

  console.log(`✅ Final: ${finalGames.length}`)
  console.log(`⏳ Pending: ${pendingGames.length}`)

  if (pendingGames.length > 0) {
    console.log('\n⚠️ WARNING: Week 6 has unfinished games:')
    pendingGames.forEach(g => {
      console.log(`  - ${g.away_team_id} @ ${g.home_team_id} (${g.status})`)
    })
  }

  // 2. Check Week 6 picks
  const { data: week6Picks, error: picksError } = await supabase
    .from('picks')
    .select(`
      *,
      users:user_id (username, display_name)
    `)
    .eq('week', 6)
    .order('is_correct', { ascending: false })

  if (picksError) {
    console.error('Error fetching Week 6 picks:', picksError)
    return
  }

  const correctPicks = week6Picks.filter(p => p.is_correct === true)
  const incorrectPicks = week6Picks.filter(p => p.is_correct === false)
  const pendingPicks = week6Picks.filter(p => p.is_correct === null)

  console.log(`\n📋 WEEK 6 PICKS (${week6Picks.length} total):`)
  console.log(`✅ Correct: ${correctPicks.length}`)
  console.log(`❌ Incorrect: ${incorrectPicks.length}`)
  console.log(`⏳ Pending: ${pendingPicks.length}`)

  if (incorrectPicks.length > 0) {
    console.log('\n❌ INCORRECT PICKS:')
    incorrectPicks.forEach(p => {
      const user = Array.isArray(p.users) ? p.users[0] : p.users
      console.log(`  - ${user?.display_name} (${user?.username})`)
    })
  }

  // 3. Check eliminations
  const { data: eliminated, error: elimError } = await supabase
    .from('league_members')
    .select(`
      *,
      users:user_id (username, display_name)
    `)
    .eq('is_eliminated', true)
    .eq('eliminated_week', 6)

  if (elimError) {
    console.error('Error fetching eliminations:', elimError)
    return
  }

  console.log(`\n💀 WEEK 6 ELIMINATIONS (${eliminated.length} total):`)
  eliminated.forEach(m => {
    const user = Array.isArray(m.users) ? m.users[0] : m.users
    console.log(`  - ${user?.display_name} (${user?.username}) - Lives: ${m.lives_remaining}`)
  })

  // 4. Current standings
  const { data: allMembers, error: membersError } = await supabase
    .from('league_members')
    .select(`
      *,
      users:user_id (username, display_name)
    `)
    .order('lives_remaining', { ascending: false })
    .order('is_eliminated')

  if (membersError) {
    console.error('Error fetching members:', membersError)
    return
  }

  const alive = allMembers.filter(m => !m.is_eliminated)
  const twoLives = alive.filter(m => m.lives_remaining === 2)
  const oneLife = alive.filter(m => m.lives_remaining === 1)
  const totalEliminated = allMembers.filter(m => m.is_eliminated)

  console.log(`\n📊 CURRENT STANDINGS:`)
  console.log(`💚 2 Lives: ${twoLives.length} players`)
  twoLives.forEach(m => {
    const user = Array.isArray(m.users) ? m.users[0] : m.users
    console.log(`   - ${user?.display_name}`)
  })
  console.log(`⚠️  1 Life: ${oneLife.length} players`)
  oneLife.forEach(m => {
    const user = Array.isArray(m.users) ? m.users[0] : m.users
    console.log(`   - ${user?.display_name}`)
  })
  console.log(`💀 Eliminated: ${totalEliminated.length} players`)

  // 5. Check Week 7 games
  console.log('\n\n🔍 CHECKING WEEK 7 GAMES...\n')

  const { data: week7Games, error: week7Error } = await supabase
    .from('games')
    .select('*')
    .eq('season_year', 2025)
    .eq('week', 7)
    .order('game_time')

  if (week7Error) {
    console.error('Error fetching Week 7 games:', week7Error)
    return
  }

  console.log(`📊 WEEK 7 GAMES: ${week7Games.length} games found`)

  if (week7Games.length === 0) {
    console.log('⚠️  No Week 7 games found - need to sync!')
  } else {
    console.log('\n📅 Week 7 Schedule:')
    week7Games.forEach(g => {
      const gameTime = new Date(g.game_time).toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
      console.log(`  ${gameTime}: Away Team ${g.away_team_id} @ Home Team ${g.home_team_id} (${g.status})`)
    })
  }

  // 6. Check Week 7 picks
  const { data: week7Picks, error: week7PicksError } = await supabase
    .from('picks')
    .select('*')
    .eq('week', 7)

  if (!week7PicksError) {
    console.log(`\n✅ Week 7 picks status: ${week7Picks.length} picks already submitted`)
  }

  // Summary
  console.log('\n\n' + '='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))
  console.log(`Week 6 Status: ${pendingGames.length === 0 ? '✅ COMPLETE' : '⚠️ INCOMPLETE'}`)
  console.log(`Week 6 Eliminations: ${eliminated.length} (Keegan McAdam expected)`)
  console.log(`Players Remaining: ${alive.length}/${allMembers.length}`)
  console.log(`Week 7 Games: ${week7Games.length} games ${week7Games.length > 0 ? 'ready' : 'NEED TO SYNC'}`)
  console.log(`Week 7 Picks Open: ${week7Games.length > 0 ? '✅ YES' : '❌ NO'}`)
  console.log('='.repeat(60))

  return {
    week6Complete: pendingGames.length === 0,
    week7GamesCount: week7Games.length,
    needsWeek7Sync: week7Games.length === 0
  }
}

verifyWeek6AndOpenWeek7()
  .then(result => {
    if (result?.needsWeek7Sync) {
      console.log('\n💡 Next Step: Run sync-week7-games.js to load Week 7 schedule')
    }
    process.exit(0)
  })
  .catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
