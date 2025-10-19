import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cggoycedsybrajvdqjjk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'

const supabase = createClient(supabaseUrl, supabaseKey)

async function addMissingGame() {
  console.log('🏈 Adding missing WSH @ DAL game to Week 7\n')

  // Get team IDs from database
  const { data: teams } = await supabase
    .from('teams')
    .select('id, team_id, key')
    .in('key', ['WSH', 'DAL'])

  const wshTeam = teams.find(t => t.key === 'WSH')
  const dalTeam = teams.find(t => t.key === 'DAL')

  console.log(`WSH team_id: ${wshTeam.team_id}`)
  console.log(`DAL team_id: ${dalTeam.team_id}\n`)

  // Fetch ESPN data for Week 7
  const response = await fetch(
    'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=7&seasontype=2&dates=2025'
  )
  const espnData = await response.json()

  // Find WSH @ DAL game
  const espnGame = espnData.events.find(e => {
    const comp = e.competitions[0]
    const homeTeam = comp.competitors.find(c => c.homeAway === 'home')
    const awayTeam = comp.competitors.find(c => c.homeAway === 'away')
    return homeTeam.team.abbreviation === 'DAL' && awayTeam.team.abbreviation === 'WSH'
  })

  if (!espnGame) {
    console.log('❌ WSH @ DAL not found in ESPN data')
    return
  }

  const gameTime = espnGame.date
  const espnEventId = espnGame.id

  console.log(`Found ESPN game:`)
  console.log(`   Event ID: ${espnEventId}`)
  console.log(`   Time: ${new Date(gameTime).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}\n`)

  // Insert the game
  const { data, error } = await supabase
    .from('games')
    .insert({
      season_year: 2025,
      week: 7,
      home_team_id: dalTeam.team_id,
      away_team_id: wshTeam.team_id,
      game_time: gameTime,
      espn_event_id: espnEventId,
      is_final: false
    })
    .select()

  if (error) {
    console.log(`❌ Error inserting: ${error.message}`)
    console.log(error)
  } else {
    console.log(`✅ Successfully added WSH @ DAL to Week 7!`)
  }
}

addMissingGame().catch(console.error)
