import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cggoycedsybrajvdqjjk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkWeek7Status() {
  console.log('🏈 WEEK 7 FINAL STATUS CHECK\n')

  // Get all Week 7 games
  const { data: games, error } = await supabase
    .from('games')
    .select(`
      *,
      home:teams!games_home_team_id_fkey(key, name, city),
      away:teams!games_away_team_id_fkey(key, name, city)
    `)
    .eq('season_year', 2025)
    .eq('week', 7)
    .order('game_time')

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`Found ${games.length} Week 7 games:\n`)

  const now = new Date()
  let locked = 0
  let available = 0

  games.forEach((game, idx) => {
    const gameTime = new Date(game.game_time)
    const isLocked = gameTime <= now
    const homeKey = game.home?.key || '???'
    const awayKey = game.away?.key || '???'
    const status = isLocked ? '🔒 LOCKED' : '✅ AVAILABLE'

    if (isLocked) locked++
    else available++

    console.log(`${idx + 1}. ${status} - ${awayKey} @ ${homeKey}`)
    console.log(`   Time: ${gameTime.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`)
    console.log(`   Final: ${game.is_final ? 'Yes' : 'No'}`)
    console.log('')
  })

  console.log('='.repeat(70))
  console.log(`📊 SUMMARY`)
  console.log('='.repeat(70))
  console.log(`Total games: ${games.length}`)
  console.log(`🔒 Locked/Started: ${locked}`)
  console.log(`✅ Available for picks: ${available}`)
  console.log('')

  // Check Week 7 picks
  const { data: picks, error: picksError } = await supabase
    .from('picks')
    .select(`
      *,
      user:users(display_name),
      team:teams(key, name)
    `)
    .eq('week', 7)

  if (!picksError) {
    console.log(`\n📝 Week 7 Picks: ${picks.length} submitted`)
    picks.forEach(pick => {
      const userName = pick.user?.display_name || 'Unknown'
      const teamKey = pick.team?.key || '???'
      console.log(`   - ${userName}: ${teamKey}`)
    })
  }
}

checkWeek7Status().catch(console.error)
