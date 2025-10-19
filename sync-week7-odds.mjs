import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cggoycedsybrajvdqjjk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'

const supabase = createClient(supabaseUrl, supabaseKey)

async function getTeamMapping() {
  const { data: teams } = await supabase
    .from('teams')
    .select('team_id, key')
    .order('team_id')

  const mapping = {}
  teams.forEach(team => {
    mapping[team.key] = team.team_id
  })

  return mapping
}

async function syncWeek7() {
  console.log('🏈 SYNCING WEEK 7 WITH ESPN DATA\n')

  const teamMapping = await getTeamMapping()

  const response = await fetch(
    'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=7&seasontype=2&dates=2025'
  )
  const espnData = await response.json()

  console.log(`Found ${espnData.events.length} games from ESPN\n`)

  let synced = 0

  for (const event of espnData.events) {
    const comp = event.competitions[0]
    const homeTeam = comp.competitors.find(c => c.homeAway === 'home')
    const awayTeam = comp.competitors.find(c => c.homeAway === 'away')

    const homeAbbr = homeTeam.team.abbreviation
    const awayAbbr = awayTeam.team.abbreviation
    const homeId = teamMapping[homeAbbr]
    const awayId = teamMapping[awayAbbr]

    const gameTime = event.date
    const espnEventId = event.id

    const { data: existing } = await supabase
      .from('games')
      .select('id')
      .eq('season_year', 2025)
      .eq('week', 7)
      .eq('home_team_id', homeId)
      .eq('away_team_id', awayId)
      .single()

    if (existing) {
      await supabase
        .from('games')
        .update({ espn_event_id: espnEventId, game_time: gameTime })
        .eq('id', existing.id)

      console.log(`✅ ${awayAbbr} @ ${homeAbbr}`)
      synced++
    }
  }

  console.log(`\n✨ Synced ${synced} Week 7 games!`)
}

syncWeek7().catch(console.error)
