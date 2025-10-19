// Check Week 7 picks to see if any picked teams that aren't in real Week 7 games
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://cggoycedsybrajvdqjjk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
)

console.log('🔍 CHECKING WEEK 7 PICKS\n')

// Real Week 7 teams playing (from ESPN)
const realWeek7Teams = [
  'LAR', 'JAX', 'NO', 'CHI', 'MIA', 'CLE', 'NE', 'TEN',
  'LV', 'KC', 'PHI', 'MIN', 'CAR', 'NYJ', 'NYG', 'DEN',
  'IND', 'LAC', 'WSH', 'DAL', 'GB', 'ARI', 'ATL', 'SF',
  'PIT', 'CIN', 'TB', 'DET', 'HOU', 'SEA'
]

const teamMapping = {
  1: 'ARI', 2: 'ATL', 3: 'BAL', 4: 'BUF', 5: 'CAR', 6: 'CHI',
  7: 'CIN', 8: 'CLE', 9: 'DAL', 10: 'DEN', 11: 'DET', 12: 'GB',
  13: 'HOU', 14: 'IND', 15: 'JAX', 16: 'KC', 17: 'LAC', 18: 'LAR',
  19: 'LV', 20: 'MIA', 21: 'MIN', 22: 'NE', 23: 'NO', 24: 'NYG',
  25: 'NYJ', 26: 'PHI', 27: 'PIT', 28: 'SEA', 29: 'SF', 30: 'TB',
  33: 'TEN', 34: 'WSH'
}

// Get all Week 7 picks
const { data: picks } = await supabase
  .from('picks')
  .select(`
    *,
    users:user_id (username, display_name),
    teams:team_id (key, city, name)
  `)
  .eq('week', 7)

console.log(`Found ${picks.length} Week 7 picks\n`)
console.log('='.repeat(70))

let invalidPicks = 0

picks.forEach(pick => {
  const user = Array.isArray(pick.users) ? pick.users[0] : pick.users
  const team = Array.isArray(pick.teams) ? pick.teams[0] : pick.teams
  const teamKey = team.key

  const isRealWeek7Team = realWeek7Teams.includes(teamKey)

  if (!isRealWeek7Team) {
    console.log(`❌ INVALID PICK:`)
    console.log(`   Player: ${user.display_name} (${user.username})`)
    console.log(`   Picked: ${team.city} ${team.name} (${teamKey})`)
    console.log(`   Problem: ${teamKey} is NOT playing in real Week 7!`)
    console.log()
    invalidPicks++
  } else {
    console.log(`✅ ${user.display_name}: ${team.city} ${team.name} (${teamKey}) - valid`)
  }
})

console.log('='.repeat(70))
console.log('\n📊 SUMMARY:')
console.log(`Total picks: ${picks.length}`)
console.log(`✅ Valid picks (team playing in real Week 7): ${picks.length - invalidPicks}`)
console.log(`❌ Invalid picks (team NOT in real Week 7): ${invalidPicks}`)

if (invalidPicks === 0) {
  console.log('\n✨ ALL PICKS ARE VALID!')
  console.log('All players picked teams that are actually playing in the real 2025 NFL Week 7.')
  console.log('The matchups in the database might be wrong, but the PICKS are fine.')
} else {
  console.log('\n⚠️  PROBLEM DETECTED!')
  console.log(`${invalidPicks} player(s) picked teams that aren't playing in real Week 7.`)
  console.log('This means they used the fake schedule in the database.')
}
