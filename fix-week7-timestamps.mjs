// Fix Week 7 Game Timestamps - Match to Real 2025 NFL Schedule
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

// Reverse mapping: ID to key
const idToKey = {}
Object.entries(teamMapping).forEach(([key, id]) => {
  idToKey[id] = key
})

console.log('🔄 FIXING WEEK 7 TIMESTAMPS\n')
console.log('Current time:', new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
console.log('Current UTC:', new Date().toISOString())
console.log()

// Step 1: Get current database games
console.log('📊 Step 1: Reading database games...\n')
const { data: dbGames } = await supabase
  .from('games')
  .select('*')
  .eq('season_year', 2025)
  .eq('week', 7)

console.log(`Found ${dbGames.length} games in database:`)
dbGames.forEach(g => {
  const away = idToKey[g.away_team_id]
  const home = idToKey[g.home_team_id]
  const time = new Date(g.game_time).toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
  console.log(`  ${away} @ ${home} - ${time}`)
})

// Step 2: Fetch real ESPN schedule for 2025 Week 7
console.log('\n📥 Step 2: Fetching ESPN 2025 Week 7 schedule...\n')
const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=7&seasontype=2&dates=2025')
const espnData = await response.json()

console.log(`Found ${espnData.events.length} games from ESPN:`)
espnData.events.forEach(event => {
  const comp = event.competitions[0]
  const home = comp.competitors.find(c => c.homeAway === 'home')
  const away = comp.competitors.find(c => c.homeAway === 'away')
  const time = new Date(event.date).toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
  console.log(`  ${away.team.abbreviation} @ ${home.team.abbreviation} - ${time} (${event.date})`)
})

// Step 3: Match and update
console.log('\n🔄 Step 3: Matching games and updating timestamps...\n')

let matched = 0
let updated = 0
let skipped = 0

for (const dbGame of dbGames) {
  const dbAway = idToKey[dbGame.away_team_id]
  const dbHome = idToKey[dbGame.home_team_id]

  // Find matching ESPN game
  const espnGame = espnData.events.find(event => {
    const comp = event.competitions[0]
    const home = comp.competitors.find(c => c.homeAway === 'home')
    const away = comp.competitors.find(c => c.homeAway === 'away')

    return home.team.abbreviation === dbHome && away.team.abbreviation === dbAway
  })

  if (!espnGame) {
    console.log(`⚠️  NO MATCH: ${dbAway} @ ${dbHome} - keeping existing time`)
    skipped++
    continue
  }

  matched++

  const oldTime = dbGame.game_time
  const newTime = espnGame.date

  const oldDisplay = new Date(oldTime).toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })

  const newDisplay = new Date(newTime).toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })

  // Update the game time
  const { error } = await supabase
    .from('games')
    .update({
      game_time: newTime,
      espn_event_id: espnGame.id,
      last_updated: new Date().toISOString()
    })
    .eq('id', dbGame.id)

  if (error) {
    console.log(`❌ ERROR: ${dbAway} @ ${dbHome}:`, error.message)
  } else {
    console.log(`✅ ${dbAway} @ ${dbHome}`)
    console.log(`   OLD: ${oldDisplay}`)
    console.log(`   NEW: ${newDisplay}`)

    // Check if game has started
    const now = new Date()
    const gameTime = new Date(newTime)
    const hasStarted = gameTime <= now
    console.log(`   STATUS: ${hasStarted ? '🔒 LOCKED (started)' : '✅ OPEN (not started)'}`)
    console.log()
    updated++
  }
}

// Step 4: Verify
console.log('=' .repeat(70))
console.log('SUMMARY')
console.log('='.repeat(70))
console.log(`Total games: ${dbGames.length}`)
console.log(`Matched with ESPN: ${matched}`)
console.log(`Updated: ${updated}`)
console.log(`Skipped (no match): ${skipped}`)

// Show final state
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
console.log(`✅ ${openCount} games OPEN for picks`)
console.log(`🔒 ${lockedCount} games LOCKED (already started)`)
console.log()
console.log('✨ Timestamps fixed!')
