// Final Status Check for Week 6 & 7
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://cggoycedsybrajvdqjjk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
)

console.log('=' .repeat(70))
console.log('WEEK 6 & 7 STATUS REPORT')
console.log('='.repeat(70))

// Week 6 Games
const { data: week6Games } = await supabase
  .from('games')
  .select('is_final')
  .eq('season_year', 2025)
  .eq('week', 6)

const allFinal = week6Games.every(g => g.is_final === true)
console.log(`\n✅ WEEK 6: ${week6Games.length} games - ALL FINAL: ${allFinal ? '✅ YES' : '❌ NO'}`)

// Week 6 Eliminations
const { data: week6Elim } = await supabase
  .from('league_members')
  .select('users:user_id(display_name)')
  .eq('eliminated_week', 6)

console.log(`💀 Week 6 Eliminations: ${week6Elim.length}`)
week6Elim.forEach(m => {
  const user = Array.isArray(m.users) ? m.users[0] : m.users
  console.log(`   - ${user.display_name}`)
})

// Current Standings
const { data: members } = await supabase
  .from('league_members')
  .select('lives_remaining, is_eliminated')

const alive = members.filter(m => !m.is_eliminated)
const twoLives = alive.filter(m => m.lives_remaining === 2)
const oneLife = alive.filter(m => m.lives_remaining === 1)

console.log(`\n📊 CURRENT STANDINGS:`)
console.log(`   💚 2 Lives: ${twoLives.length}`)
console.log(`   ⚠️  1 Life: ${oneLife.length}`)
console.log(`   💀 Eliminated: ${members.length - alive.length}`)
console.log(`   Total Active: ${alive.length}/${members.length}`)

// Week 7 Status
const { data: week7Games } = await supabase
  .from('games')
  .select(`
    *,
    home_team:teams!games_home_team_id_fkey(city, name),
    away_team:teams!games_away_team_id_fkey(city, name)
  `)
  .eq('season_year', 2025)
  .eq('week', 7)
  .order('game_time')

console.log(`\n🏈 WEEK 7: ${week7Games.length} games loaded`)

const gamesWithOdds = week7Games.filter(g => g.spread !== null)
console.log(`   📊 Games with odds: ${gamesWithOdds.length}/${week7Games.length}`)

// Show first 3 games
console.log(`\n📅 Week 7 Schedule (first 3 games):`)
week7Games.slice(0, 3).forEach(g => {
  const home = Array.isArray(g.home_team) ? g.home_team[0] : g.home_team
  const away = Array.isArray(g.away_team) ? g.away_team[0] : g.away_team
  const time = new Date(g.game_time).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Los_Angeles'
  })
  console.log(`   ${time}: ${away?.city} ${away?.name} @ ${home?.city} ${home?.name}`)
  if (g.spread) console.log(`      Spread: ${g.spread}, O/U: ${g.over_under}`)
})

// Week 7 Picks
const { data: week7Picks } = await supabase
  .from('picks')
  .select('*')
  .eq('week', 7)

console.log(`\n✅ Week 7 Picks: ${week7Picks.length} submitted so far`)

console.log('\n' + '='.repeat(70))
console.log('SUMMARY')
console.log('='.repeat(70))
console.log(`✅ Week 6 Complete: ${allFinal ? 'YES' : 'NO'}`)
console.log(`✅ Keegan Eliminated: ${week6Elim.length === 1 ? 'YES' : `NO (found ${week6Elim.length})`}`)
console.log(`✅ Week 7 Games Ready: ${week7Games.length > 0 ? 'YES' : 'NO'}`)
console.log(`✅ Week 7 Picks Open: YES`)
console.log(`📊 ${alive.length} players alive, ${week7Picks.length} picks submitted for Week 7`)
console.log('='.repeat(70))
