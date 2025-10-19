import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cggoycedsybrajvdqjjk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'

const supabase = createClient(supabaseUrl, supabaseKey)

async function migratePicksForWeek(week) {
  console.log(`\n📅 MIGRATING WEEK ${week} PICKS...`)

  // Get all old SportsData games for this week
  const { data: oldGames } = await supabase
    .from('games')
    .select('id, home_team_id, away_team_id')
    .eq('season_year', 2025)
    .eq('week', week)
    .not('sports_data_game_id', 'is', null)

  // Get all ESPN games for this week
  const { data: espnGames } = await supabase
    .from('games')
    .select('id, home_team_id, away_team_id')
    .eq('season_year', 2025)
    .eq('week', week)
    .not('espn_event_id', 'is', null)

  console.log(`   Found ${oldGames.length} old games, ${espnGames.length} ESPN games`)

  // Get picks referencing old games
  const oldGameIds = oldGames.map(g => g.id)
  const { data: picks } = await supabase
    .from('picks')
    .select('id, game_id, user_id, team_id')
    .in('game_id', oldGameIds)

  if (!picks || picks.length === 0) {
    console.log(`   ✅ No picks to migrate`)
    return { migrated: 0, failed: 0 }
  }

  console.log(`   Found ${picks.length} picks to migrate`)

  let migrated = 0
  let failed = 0

  for (const pick of picks) {
    // Find the old game
    const oldGame = oldGames.find(g => g.id === pick.game_id)
    if (!oldGame) {
      console.log(`   ❌ Could not find old game for pick ${pick.id}`)
      failed++
      continue
    }

    // Find matching ESPN game (same teams)
    const espnGame = espnGames.find(g =>
      g.home_team_id === oldGame.home_team_id &&
      g.away_team_id === oldGame.away_team_id
    )

    if (!espnGame) {
      console.log(`   ⚠️  No ESPN game matches old game teams (home: ${oldGame.home_team_id}, away: ${oldGame.away_team_id})`)
      failed++
      continue
    }

    // Update the pick to reference the ESPN game
    const { error } = await supabase
      .from('picks')
      .update({ game_id: espnGame.id })
      .eq('id', pick.id)

    if (error) {
      console.log(`   ❌ Error updating pick ${pick.id}: ${error.message}`)
      failed++
    } else {
      migrated++
    }
  }

  console.log(`   ✅ Migrated: ${migrated}, ❌ Failed: ${failed}`)
  return { migrated, failed }
}

async function migrateAllPicks() {
  console.log('🔄 MIGRATING ALL PICKS FROM OLD SPORTSDATA GAMES TO ESPN GAMES\n')
  console.log('This will update pick references to use ESPN games instead of old SportsData games.')
  console.log('The picks themselves (user, team, week) will not change.')
  console.log('BACKUP ALREADY CREATED - Safe to proceed!\n')

  let totalMigrated = 0
  let totalFailed = 0

  for (let week = 1; week <= 7; week++) {
    const result = await migratePicksForWeek(week)
    totalMigrated += result.migrated
    totalFailed += result.failed
  }

  console.log('\n' + '='.repeat(70))
  console.log('📊 MIGRATION SUMMARY')
  console.log('='.repeat(70))
  console.log(`✅ Total migrated: ${totalMigrated}`)
  console.log(`❌ Total failed: ${totalFailed}`)

  if (totalFailed === 0) {
    console.log('\n✨ All picks successfully migrated to ESPN games!')
    console.log('\nNext step: Run delete-old-sportsdata-games.mjs to clean up database')
  } else {
    console.log(`\n⚠️  ${totalFailed} picks could not be migrated`)
    console.log('Review the errors above before proceeding with deletion')
  }
}

migrateAllPicks().catch(console.error)
