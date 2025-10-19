// Update Week 7 Game Times (keeping same games, just fixing times)
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://cggoycedsybrajvdqjjk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
)

console.log('🔄 UPDATING WEEK 7 GAME TIMES TO NEXT SUNDAY/MONDAY...\n')

// Get all Week 7 games
const { data: games } = await supabase
  .from('games')
  .select(`
    *,
    home_team:teams!games_home_team_id_fkey(key),
    away_team:teams!games_away_team_id_fkey(key)
  `)
  .eq('season_year', 2025)
  .eq('week', 7)
  .order('game_time')

console.log(`Found ${games.length} Week 7 games\n`)

// The issue is games are showing as started because times are in the past
// We need to add ~7 days to move them to next week (October 26/27)

for (const game of games) {
  const home = Array.isArray(game.home_team) ? game.home_team[0] : game.home_team
  const away = Array.isArray(game.away_team) ? game.away_team[0] : game.away_team

  const oldTime = new Date(game.game_time)
  // Add 7 days
  const newTime = new Date(oldTime.getTime() + (7 * 24 * 60 * 60 * 1000))

  const oldPdt = oldTime.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })

  const newPdt = newTime.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })

  const { error } = await supabase
    .from('games')
    .update({
      game_time: newTime.toISOString(),
      last_updated: new Date().toISOString()
    })
    .eq('id', game.id)

  if (error) {
    console.log(`❌ Error: ${away.key} @ ${home.key}:`, error.message)
  } else {
    console.log(`✅ ${away.key} @ ${home.key}`)
    console.log(`   FROM: ${oldPdt}`)
    console.log(`   TO:   ${newPdt}`)
    console.log()
  }
}

// Show updated schedule
const { data: updated } = await supabase
  .from('games')
  .select(`
    *,
    home_team:teams!games_home_team_id_fkey(key),
    away_team:teams!games_away_team_id_fkey(key)
  `)
  .eq('season_year', 2025)
  .eq('week', 7)
  .order('game_time')

console.log(`\n📅 UPDATED WEEK 7 SCHEDULE:`)
const now = new Date()
updated.forEach(g => {
  const home = Array.isArray(g.home_team) ? g.home_team[0] : g.home_team
  const away = Array.isArray(g.away_team) ? g.away_team[0] : g.away_team
  const time = new Date(g.game_time)
  const pdt = time.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
  const started = time <= now
  console.log(`${started ? '🔒 LOCKED' : '✅ OPEN  '}: ${pdt} - ${away.key} @ ${home.key}`)
})

console.log('\n✨ All Week 7 games moved to next week (Oct 26/27)!')
console.log('🎯 Games should now be OPEN for picks!')
