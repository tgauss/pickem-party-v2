import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cggoycedsybrajvdqjjk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'

const supabase = createClient(supabaseUrl, supabaseKey)

const games = [
  { week: 9, away: 'SEA', awayId: 32, home: 'WSH', homeId: 20 },
  { week: 12, away: 'SEA', awayId: 32, home: 'TEN', homeId: 12 },
  { week: 15, away: 'TEN', awayId: 12, home: 'SF', homeId: 31 }
]

async function syncGame(game) {
  const { week, away, awayId, home, homeId } = game

  console.log(`\n🔍 Fetching Week ${week} ${away} @ ${home} from ESPN...`)

  // Fetch ESPN schedule
  const response = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&seasontype=2&dates=2025`
  )
  const espnData = await response.json()

  // Find the game
  const espnGame = espnData.events.find(e => {
    const comp = e.competitions[0]
    const homeTeam = comp.competitors.find(c => c.homeAway === 'home')
    const awayTeam = comp.competitors.find(c => c.homeAway === 'away')
    return homeTeam.team.abbreviation === home && awayTeam.team.abbreviation === away
  })

  if (!espnGame) {
    console.log(`❌ Game not found in ESPN data`)
    return false
  }

  const gameTime = espnGame.date
  const espnEventId = espnGame.id

  console.log(`   ESPN Event ID: ${espnEventId}`)
  console.log(`   Game Time: ${new Date(gameTime).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`)

  // Try to insert
  console.log(`   Inserting into database...`)

  const { data, error } = await supabase
    .from('games')
    .insert({
      season_year: 2025,
      week: week,
      home_team_id: homeId,
      away_team_id: awayId,
      game_time: gameTime,
      espn_event_id: espnEventId,
      is_final: false
    })
    .select()

  if (error) {
    console.log(`   ❌ Error: ${error.message}`)
    console.log(`   Error details:`, JSON.stringify(error, null, 2))
    return false
  }

  console.log(`   ✅ Success!`)
  return true
}

async function main() {
  console.log('🏈 SYNCING FINAL 3 GAMES\n')

  let success = 0
  let failed = 0

  for (const game of games) {
    const result = await syncGame(game)
    if (result) {
      success++
    } else {
      failed++
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log('\n' + '='.repeat(70))
  console.log('📊 FINAL SUMMARY')
  console.log('='.repeat(70))
  console.log(`✅ Successfully synced: ${success}`)
  console.log(`❌ Failed: ${failed}`)
}

main().catch(console.error)
