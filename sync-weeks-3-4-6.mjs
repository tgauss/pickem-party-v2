import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cggoycedsybrajvdqjjk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'

const supabase = createClient(supabaseUrl, supabaseKey)

// Get team mapping from database
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

async function syncWeek(week, teamMapping) {
  console.log(`\n📅 SYNCING WEEK ${week}...`)

  // Fetch ESPN schedule for this week
  const response = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&seasontype=2&dates=2025`
  )
  const espnData = await response.json()

  if (!espnData.events || espnData.events.length === 0) {
    console.log(`⚠️  No games found for Week ${week}`)
    return { synced: 0, errors: 0 }
  }

  console.log(`Found ${espnData.events.length} games from ESPN`)

  let synced = 0
  let errors = 0

  for (const event of espnData.events) {
    const comp = event.competitions[0]
    const homeTeam = comp.competitors.find(c => c.homeAway === 'home')
    const awayTeam = comp.competitors.find(c => c.homeAway === 'away')

    const homeAbbr = homeTeam.team.abbreviation
    const awayAbbr = awayTeam.team.abbreviation
    const homeId = teamMapping[homeAbbr]
    const awayId = teamMapping[awayAbbr]

    if (!homeId || !awayId) {
      console.log(`❌ Could not map teams: ${awayAbbr} @ ${homeAbbr}`)
      errors++
      continue
    }

    const gameTime = event.date
    const espnEventId = event.id
    const homeScore = homeTeam.score || null
    const awayScore = awayTeam.score || null
    const isFinal = comp.status.type.completed || false

    // Check if game already exists
    const { data: existing } = await supabase
      .from('games')
      .select('id, espn_event_id')
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
          espn_event_id: espnEventId,
          home_score: homeScore,
          away_score: awayScore,
          is_final: isFinal
        })
        .eq('id', existing.id)

      if (updateError) {
        console.log(`❌ Error updating ${awayAbbr} @ ${homeAbbr}: ${updateError.message}`)
        errors++
      } else {
        console.log(`✅ Updated ${awayAbbr} @ ${homeAbbr}${isFinal ? ' (FINAL)' : ''}`)
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
          home_score: homeScore,
          away_score: awayScore,
          is_final: isFinal
        })

      if (insertError) {
        console.log(`❌ Error inserting ${awayAbbr} @ ${homeAbbr}: ${insertError.message}`)
        errors++
      } else {
        console.log(`✨ Inserted ${awayAbbr} @ ${homeAbbr}${isFinal ? ' (FINAL)' : ''}`)
        synced++
      }
    }
  }

  return { synced, errors }
}

async function main() {
  console.log('🏈 SYNCING WEEKS 3, 4, and 6 WITH ESPN SCHEDULE\n')
  console.log('This will add ESPN game data for weeks that currently only have old SportsData games.\n')

  const teamMapping = await getTeamMapping()

  let totalSynced = 0
  let totalErrors = 0

  for (const week of [3, 4, 6]) {
    const result = await syncWeek(week, teamMapping)
    totalSynced += result.synced
    totalErrors += result.errors
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log('\n' + '='.repeat(70))
  console.log('📊 SUMMARY')
  console.log('='.repeat(70))
  console.log(`✅ Total games synced: ${totalSynced}`)
  console.log(`❌ Total errors: ${totalErrors}`)
  console.log('\n✨ Weeks 3, 4, and 6 are now synced with ESPN!')
  console.log('\nNext step: Re-run migrate-picks-to-espn-games.mjs to migrate all picks')
}

main().catch(console.error)
