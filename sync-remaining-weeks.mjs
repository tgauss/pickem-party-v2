import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cggoycedsybrajvdqjjk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'

const supabase = createClient(supabaseUrl, supabaseKey)

// ESPN team abbreviations to database team_id mapping
const teamMapping = {
  'ARI': 1, 'ATL': 2, 'BAL': 3, 'BUF': 4, 'CAR': 5, 'CHI': 6,
  'CIN': 7, 'CLE': 8, 'DAL': 9, 'DEN': 10, 'DET': 11, 'GB': 12,
  'HOU': 13, 'IND': 14, 'JAX': 15, 'KC': 16, 'LAC': 17, 'LAR': 18,
  'LV': 19, 'MIA': 20, 'MIN': 21, 'NE': 22, 'NO': 23, 'NYG': 24,
  'NYJ': 25, 'PHI': 26, 'PIT': 27, 'SF': 28, 'SEA': 29, 'TB': 30,
  'TEN': 31, 'WSH': 32
}

async function syncWeek(week) {
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

    const gameTime = event.date // ISO timestamp from ESPN
    const espnEventId = event.id

    // Check if game already exists in database
    const { data: existing, error: fetchError } = await supabase
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
          espn_event_id: espnEventId
        })
        .eq('id', existing.id)

      if (updateError) {
        console.log(`❌ Error updating ${awayAbbr} @ ${homeAbbr}: ${updateError.message}`)
        errors++
      } else {
        console.log(`✅ Updated ${awayAbbr} @ ${homeAbbr} - ${new Date(gameTime).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`)
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
        console.log(`❌ Error inserting ${awayAbbr} @ ${homeAbbr}: ${insertError.message}`)
        errors++
      } else {
        console.log(`✨ Inserted ${awayAbbr} @ ${homeAbbr} - ${new Date(gameTime).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`)
        synced++
      }
    }
  }

  return { synced, errors }
}

async function main() {
  console.log('🏈 SYNCING ALL REMAINING WEEKS (7-18) WITH ESPN SCHEDULE\n')
  console.log('This will update game times and matchups for the rest of the 2025 season.')
  console.log('Existing picks will NOT be affected.\n')

  let totalSynced = 0
  let totalErrors = 0

  for (let week = 7; week <= 18; week++) {
    const result = await syncWeek(week)
    totalSynced += result.synced
    totalErrors += result.errors

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log('\n' + '='.repeat(70))
  console.log('📊 FINAL SUMMARY')
  console.log('='.repeat(70))
  console.log(`✅ Total games synced: ${totalSynced}`)
  console.log(`❌ Total errors: ${totalErrors}`)
  console.log('\n✨ All remaining weeks are now synced with ESPN!')
}

main().catch(console.error)
