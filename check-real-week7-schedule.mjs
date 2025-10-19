// SANITY CHECK: Fetch real NFL Week 7 schedule (started Thu Oct 16, 2025)
import fetch from 'node-fetch'

console.log('🏈 FETCHING REAL NFL 2025 WEEK 7 SCHEDULE\n')
console.log('Week 7 started: Thursday, October 16, 2025')
console.log('Current time:', new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
console.log('Current UTC:', new Date().toISOString())
console.log('\n' + '='.repeat(70))

// Fetch ESPN Week 7 for 2025 season
const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=7&seasontype=2&dates=2025')
const data = await response.json()

console.log(`\n📥 ESPN API returned ${data.events.length} games for Week 7\n`)

const now = new Date()

data.events.forEach((event, index) => {
  const comp = event.competitions[0]
  const home = comp.competitors.find(c => c.homeAway === 'home')
  const away = comp.competitors.find(c => c.homeAway === 'away')

  const gameTime = new Date(event.date)
  const hasStarted = gameTime <= now

  // Display in Pacific time
  const pdt = gameTime.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  })

  // Also show UTC
  const utc = event.date

  console.log(`${index + 1}. ${hasStarted ? '🔒 STARTED' : '✅ UPCOMING'}`)
  console.log(`   ${away.team.abbreviation} @ ${home.team.abbreviation}`)
  console.log(`   ${away.team.location} ${away.team.name} @ ${home.team.location} ${home.team.name}`)
  console.log(`   Pacific: ${pdt}`)
  console.log(`   UTC: ${utc}`)
  console.log(`   ESPN Event ID: ${event.id}`)
  console.log()
})

console.log('='.repeat(70))
console.log('\n📊 SUMMARY:')
const startedGames = data.events.filter(e => new Date(e.date) <= now)
const upcomingGames = data.events.filter(e => new Date(e.date) > now)

console.log(`🔒 Games that have started: ${startedGames.length}`)
console.log(`✅ Games still upcoming: ${upcomingGames.length}`)
console.log(`📅 Total games: ${data.events.length}`)

console.log('\n🤔 DOES THIS LOOK CORRECT?')
console.log('If YES, we can proceed to update the database with these exact times.')
console.log('If NO, something is wrong with the ESPN API.')
