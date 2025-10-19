// Sync ALL remaining 2025 season weeks (7-18) with correct ESPN schedule
// Matches games by team matchups and updates times
// NO PICKS WILL BE DELETED OR MODIFIED
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

console.log('🔄 SYNCING ALL REMAINING 2025 NFL WEEKS\n')
console.log('Current time:', new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
console.log('\n⚠️  NO PICKS WILL BE DELETED - only updating game times\n')
console.log('='.repeat(70))

const stats = {
  totalWeeks: 0,
  totalGames: 0,
  matched: 0,
  updated: 0,
  skipped: 0,
  errors: 0
}

// Sync weeks 7 through 18 (regular season)
for (let week = 7; week <= 18; week++) {
  console.log(`\n📅 WEEK ${week}`)
  console.log('─'.repeat(70))

  stats.totalWeeks++

  try {
    // Fetch ESPN schedule for this week
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&seasontype=2&dates=2025`)
    const espnData = await response.json()

    if (!espnData.events || espnData.events.length === 0) {
      console.log(`⚠️  No ESPN data for Week ${week}`)
      continue
    }

    console.log(`📥 ESPN has ${espnData.events.length} games`)

    // Get database games for this week
    const { data: dbGames } = await supabase
      .from('games')
      .select('*')
      .eq('season_year', 2025)
      .eq('week', week)

    console.log(`📊 Database has ${dbGames.length} games`)
    stats.totalGames += dbGames.length

    if (dbGames.length === 0) {
      console.log(`⏭️  Skipping Week ${week} - no games in database`)
      continue
    }

    // Match and update each database game
    for (const dbGame of dbGames) {
      const dbAway = idToKey[dbGame.away_team_id]
      const dbHome = idToKey[dbGame.home_team_id]

      // Find matching ESPN game by team matchup
      const espnGame = espnData.events.find(e => {
        const comp = e.competitions[0]
        const home = comp.competitors.find(c => c.homeAway === 'home')
        const away = comp.competitors.find(c => c.homeAway === 'away')
        return home.team.abbreviation === dbHome && away.team.abbreviation === dbAway
      })

      if (!espnGame) {
        console.log(`  ⚠️  NO MATCH: ${dbAway} @ ${dbHome}`)
        stats.skipped++
        continue
      }

      stats.matched++

      const oldTime = dbGame.game_time
      const newTime = espnGame.date

      // Only update if time changed
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
          console.log(`  ❌ ${dbAway} @ ${dbHome}: ${error.message}`)
          stats.errors++
        } else {
          const oldPdt = new Date(oldTime).toLocaleString('en-US', {
            timeZone: 'America/Los_Angeles',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })
          const newPdt = new Date(newTime).toLocaleString('en-US', {
            timeZone: 'America/Los_Angeles',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })
          console.log(`  ✅ ${dbAway} @ ${dbHome}: ${oldPdt} → ${newPdt}`)
          stats.updated++
        }
      } else {
        console.log(`  ⏭️  ${dbAway} @ ${dbHome}: already correct`)
      }
    }

  } catch (error) {
    console.log(`❌ Error syncing Week ${week}:`, error.message)
    stats.errors++
  }
}

// Summary
console.log('\n' + '='.repeat(70))
console.log('📊 SYNC COMPLETE')
console.log('='.repeat(70))
console.log(`Weeks processed: ${stats.totalWeeks}`)
console.log(`Total games checked: ${stats.totalGames}`)
console.log(`✅ Matched with ESPN: ${stats.matched}`)
console.log(`📝 Times updated: ${stats.updated}`)
console.log(`⏭️  Skipped (no match): ${stats.skipped}`)
console.log(`❌ Errors: ${stats.errors}`)
console.log('='.repeat(70))

// Show current Week 7 status
console.log('\n📅 WEEK 7 FINAL STATUS:')
const { data: week7Games } = await supabase
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

week7Games.forEach(g => {
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
console.log(`🔒 ${lockedCount} games LOCKED (started)`)
console.log()
console.log('✨ All weeks synchronized!')
