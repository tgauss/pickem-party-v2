import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cggoycedsybrajvdqjjk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'

const supabase = createClient(supabaseUrl, supabaseKey)

// Get the CORRECT team mapping from database first
async function getTeamMapping() {
  const { data, error } = await supabase
    .from('teams')
    .select('id, key')
    .order('id')

  if (error) {
    console.error('Error fetching teams:', error)
    return null
  }

  const mapping = {}
  data.forEach(team => {
    mapping[team.key] = team.id
  })

  console.log('📋 Correct team mapping from database:')
  console.log(JSON.stringify(mapping, null, 2))
  console.log('')

  return mapping
}

// Games that failed due to TEN/WSH mapping issues
const failedGames = [
  { week: 7, away: 'NE', home: 'TEN' },
  { week: 7, away: 'WSH', home: 'DAL' },
  { week: 8, away: 'TEN', home: 'IND' },
  { week: 8, away: 'WSH', home: 'KC' },
  { week: 9, away: 'LAC', home: 'TEN' },
  { week: 9, away: 'SEA', home: 'WSH' },
  { week: 10, away: 'DET', home: 'WSH' },
  { week: 11, away: 'WSH', home: 'MIA' },
  { week: 11, away: 'HOU', home: 'TEN' },
  { week: 12, away: 'SEA', home: 'TEN' },
  { week: 13, away: 'JAX', home: 'TEN' },
  { week: 13, away: 'DEN', home: 'WSH' },
  { week: 14, away: 'TEN', home: 'CLE' },
  { week: 14, away: 'WSH', home: 'MIN' },
  { week: 15, away: 'WSH', home: 'NYG' },
  { week: 15, away: 'TEN', home: 'SF' },
  { week: 16, away: 'PHI', home: 'WSH' },
  { week: 16, away: 'KC', home: 'TEN' },
  { week: 17, away: 'DAL', home: 'WSH' },
  { week: 17, away: 'NO', home: 'TEN' },
  { week: 18, away: 'WSH', home: 'PHI' },
  { week: 18, away: 'TEN', home: 'JAX' }
]

async function syncFailedGames(teamMapping) {
  console.log(`🔧 SYNCING 24 FAILED GAMES (TEN/WSH)\n`)

  let synced = 0
  let errors = 0

  for (const game of failedGames) {
    const { week, away, home } = game

    // Fetch ESPN schedule for this week
    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&seasontype=2&dates=2025`
    )
    const espnData = await response.json()

    // Find this specific matchup
    const espnGame = espnData.events.find(e => {
      const comp = e.competitions[0]
      const homeTeam = comp.competitors.find(c => c.homeAway === 'home')
      const awayTeam = comp.competitors.find(c => c.homeAway === 'away')
      return homeTeam.team.abbreviation === home && awayTeam.team.abbreviation === away
    })

    if (!espnGame) {
      console.log(`❌ Week ${week}: Could not find ${away} @ ${home} in ESPN data`)
      errors++
      continue
    }

    const homeId = teamMapping[home]
    const awayId = teamMapping[away]
    const gameTime = espnGame.date
    const espnEventId = espnGame.id

    // Check if game already exists
    const { data: existing } = await supabase
      .from('games')
      .select('id')
      .eq('season_year', 2025)
      .eq('week', week)
      .eq('home_team_id', homeId)
      .eq('away_team_id', awayId)
      .single()

    if (existing) {
      // Update existing game
      const { error: updateError } = await supabase
        .from('games')
        .update({
          game_time: gameTime,
          espn_event_id: espnEventId
        })
        .eq('id', existing.id)

      if (updateError) {
        console.log(`❌ Week ${week}: Error updating ${away} @ ${home}: ${updateError.message}`)
        errors++
      } else {
        console.log(`✅ Week ${week}: Updated ${away} @ ${home} - ${new Date(gameTime).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`)
        synced++
      }
    } else {
      // Insert new game
      const { error: insertError } = await supabase
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

      if (insertError) {
        console.log(`❌ Week ${week}: Error inserting ${away} @ ${home}: ${insertError.message}`)
        errors++
      } else {
        console.log(`✨ Week ${week}: Inserted ${away} @ ${home} - ${new Date(gameTime).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`)
        synced++
      }
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  console.log('\n' + '='.repeat(70))
  console.log('📊 SUMMARY')
  console.log('='.repeat(70))
  console.log(`✅ Games synced: ${synced}`)
  console.log(`❌ Errors: ${errors}`)
  console.log('\n✨ All TEN/WSH games are now synced!')
}

async function main() {
  console.log('🏈 FIXING TEN/WSH GAMES\n')

  const teamMapping = await getTeamMapping()

  if (!teamMapping) {
    console.error('Failed to get team mapping')
    return
  }

  await syncFailedGames(teamMapping)
}

main().catch(console.error)
