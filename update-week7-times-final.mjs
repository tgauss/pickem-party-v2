// Update Week 7 game times to match ESPN exactly
// NO PICKS WILL BE MODIFIED - only game_time field
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

console.log('⏰ UPDATING WEEK 7 GAME TIMES\n')
console.log('Current time:', new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
console.log('\n⚠️  NO PICKS WILL BE MODIFIED - only updating game_time timestamps\n')
console.log('='.repeat(70))

// Get database games
const { data: dbGames } = await supabase
  .from('games')
  .select('*')
  .eq('season_year', 2025)
  .eq('week', 7)

// Get ESPN schedule
const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=7&seasontype=2&dates=2025')
const espnData = await response.json()

console.log('\n🔄 MATCHING AND UPDATING...\n')

let updated = 0
const updates = []

for (const dbGame of dbGames) {
  const dbAway = idToKey[dbGame.away_team_id]
  const dbHome = idToKey[dbGame.home_team_id]

  // Find matching ESPN game
  const espnGame = espnData.events.find(e => {
    const comp = e.competitions[0]
    const home = comp.competitors.find(c => c.homeAway === 'home')
    const away = comp.competitors.find(c => c.homeAway === 'away')
    return home.team.abbreviation === dbHome && away.team.abbreviation === dbAway
  })

  if (!espnGame) {
    console.log(`⚠️  NO MATCH: ${dbAway} @ ${dbHome} - skipping`)
    continue
  }

  const oldTime = dbGame.game_time
  const newTime = espnGame.date

  const oldPdt = new Date(oldTime).toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })

  const newPdt = new Date(newTime).toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })

  // Only update if time actually changed
  if (oldTime !== newTime) {
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
      console.log(`   OLD: ${oldPdt}`)
      console.log(`   NEW: ${newPdt}`)

      const now = new Date()
      const gameTime = new Date(newTime)
      const hasStarted = gameTime <= now
      console.log(`   ${hasStarted ? '🔒 Game started - will be LOCKED' : '✅ Not started - will be OPEN'}`)
      console.log()

      updated++
      updates.push({ game: `${dbAway} @ ${dbHome}`, old: oldPdt, new: newPdt, locked: hasStarted })
    }
  } else {
    console.log(`⏭️  ${dbAway} @ ${dbHome} - time already correct`)
  }
}

// Final status
console.log('='.repeat(70))
console.log('📊 FINAL STATUS\n')

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

console.log('\n' + '='.repeat(70))
console.log('SUMMARY')
console.log('='.repeat(70))
console.log(`✅ ${openCount} games OPEN for picks`)
console.log(`🔒 ${lockedCount} games LOCKED (already started)`)
console.log(`📝 ${updated} game times updated`)
console.log(`🎯 0 picks modified (picks table untouched)`)
console.log('='.repeat(70))
console.log('\n✨ Week 7 times synchronized with ESPN!')
