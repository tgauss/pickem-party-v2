// Restore Week 7 to original times (undo +7 days) then fix with ESPN data
import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'

const supabase = createClient(
  'https://cggoycedsybrajvdqjjk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
)

const teamMapping = {
  'ARI': 1, 'ATL': 2, 'BAL': 3, 'BUF': 4, 'CAR': 5, 'CHI': 6,
  'CIN': 7, 'CLE': 8, 'DAL': 9, 'DEN': 10, 'DET': 11, 'GB': 12,
  'HOU': 13, 'IND': 14, 'JAX': 15, 'KC': 16, 'LAC': 17, 'LAR': 18,
  'LV': 19, 'MIA': 20, 'MIN': 21, 'NE': 22, 'NO': 23, 'NYG': 24,
  'NYJ': 25, 'PHI': 26, 'PIT': 27, 'SEA': 28, 'SF': 29, 'TB': 30,
  'TEN': 33, 'WAS': 34
}

const idToKey = {}
Object.entries(teamMapping).forEach(([key, id]) => {
  idToKey[id] = key
})

console.log('🔄 RESTORING WEEK 7 TIMESTAMPS\n')
console.log('Current time:', new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
console.log()

// Step 1: Subtract 7 days to restore original times
console.log('⏪ Step 1: Restoring original times (subtracting 7 days)...\n')

const { data: games } = await supabase
  .from('games')
  .select('*')
  .eq('season_year', 2025)
  .eq('week', 7)

for (const game of games) {
  const currentTime = new Date(game.game_time)
  const originalTime = new Date(currentTime.getTime() - (7 * 24 * 60 * 60 * 1000)) // Subtract 7 days

  await supabase
    .from('games')
    .update({ game_time: originalTime.toISOString() })
    .eq('id', game.id)
}

console.log('✅ Restored original times\n')

// Step 2: Get restored games
const { data: restoredGames } = await supabase
  .from('games')
  .select('*')
  .eq('season_year', 2025)
  .eq('week', 7)
  .order('game_time')

console.log('📊 Step 2: Current database games after restoration:\n')
restoredGames.forEach(g => {
  const away = idToKey[g.away_team_id]
  const home = idToKey[g.home_team_id]
  const time = new Date(g.game_time)
  const pdt = time.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
  console.log(`  ${away} @ ${home} - ${pdt} (${g.game_time})`)
})

// Step 3: Fetch ESPN
console.log('\n📥 Step 3: Fetching ESPN 2025 Week 7...\n')
const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=7&seasontype=2&dates=2025')
const espnData = await response.json()

console.log('ESPN games:')
espnData.events.forEach(e => {
  const comp = e.competitions[0]
  const home = comp.competitors.find(c => c.homeAway === 'home')
  const away = comp.competitors.find(c => c.homeAway === 'away')
  const time = new Date(e.date).toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
  console.log(`  ${away.team.abbreviation} @ ${home.team.abbreviation} - ${time}`)
})

// Step 4: Match and update with EXACT ESPN times
console.log('\n🔄 Step 4: Updating to exact ESPN times...\n')

let updated = 0

for (const dbGame of restoredGames) {
  const dbAway = idToKey[dbGame.away_team_id]
  const dbHome = idToKey[dbGame.home_team_id]

  const espnGame = espnData.events.find(e => {
    const comp = e.competitions[0]
    const home = comp.competitors.find(c => c.homeAway === 'home')
    const away = comp.competitors.find(c => c.homeAway === 'away')
    return home.team.abbreviation === dbHome && away.team.abbreviation === dbAway
  })

  if (espnGame) {
    const espnTime = espnGame.date

    const { error } = await supabase
      .from('games')
      .update({
        game_time: espnTime,
        espn_event_id: espnGame.id,
        last_updated: new Date().toISOString()
      })
      .eq('id', dbGame.id)

    if (!error) {
      const oldPdt = new Date(dbGame.game_time).toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })

      const newPdt = new Date(espnTime).toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })

      console.log(`✅ ${dbAway} @ ${dbHome}`)
      console.log(`   FROM: ${oldPdt}`)
      console.log(`   TO:   ${newPdt}`)
      updated++
    }
  } else {
    console.log(`⚠️  NO ESPN MATCH: ${dbAway} @ ${dbHome}`)
  }
}

// Step 5: Final status
console.log('\n📅 FINAL WEEK 7 SCHEDULE:\n')

const { data: finalGames } = await supabase
  .from('games')
  .select(`
    *,
    home_team:teams!games_home_team_id_fkey(key, city, name),
    away_team:teams!games_away_team_id_fkey(key, city, name)
  `)
  .eq('season_year', 2025)
  .eq('week', 7)
  .order('game_time')

const now = new Date()
let openCount = 0
let lockedCount = 0

finalGames.forEach(g => {
  const home = Array.isArray(g.home_team) ? g.home_team[0] : g.home_team
  const away = Array.isArray(g.away_team) ? g.away_team[0] : g.away_team
  const gameTime = new Date(g.game_time)
  const hasStarted = gameTime <= now

  if (hasStarted) lockedCount++
  else openCount++

  const display = gameTime.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })

  console.log(`${hasStarted ? '🔒' : '✅'} ${display}: ${away.city} ${away.name} @ ${home.city} ${home.name}`)
})

console.log()
console.log('='.repeat(70))
console.log(`✅ ${openCount} games OPEN for picks`)
console.log(`🔒 ${lockedCount} games LOCKED (already started)`)
console.log(`📝 ${updated} games updated with ESPN times`)
console.log('='.repeat(70))
console.log('\n✨ Week 7 times corrected!')
