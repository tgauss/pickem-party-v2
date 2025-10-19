import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cggoycedsybrajvdqjjk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'

const supabase = createClient(supabaseUrl, supabaseKey)

async function deleteOldGames() {
  console.log('🗑️  DELETING OLD SPORTSDATA.IO GAMES\n')

  // Get all old games
  const { data: oldGames, count } = await supabase
    .from('games')
    .select('id, week', { count: 'exact' })
    .eq('season_year', 2025)
    .not('sports_data_game_id', 'is', null)

  console.log(`Found ${count} old SportsData games to delete\n`)

  // Verify no picks reference these games
  if (oldGames && oldGames.length > 0) {
    const oldGameIds = oldGames.map(g => g.id)

    const { data: picks, count: pickCount } = await supabase
      .from('picks')
      .select('id', { count: 'exact', head: true })
      .in('game_id', oldGameIds)

    if (pickCount > 0) {
      console.log(`❌ STOP! ${pickCount} picks still reference old games!`)
      console.log('Migration may have failed. Do not delete.')
      return
    }

    console.log('✅ Verified: No picks reference old games\n')
  }

  // Delete old games
  const { error } = await supabase
    .from('games')
    .delete()
    .eq('season_year', 2025)
    .not('sports_data_game_id', 'is', null)

  if (error) {
    console.log('❌ Error deleting:', error.message)
  } else {
    console.log(`✅ Successfully deleted ${count} old SportsData games!`)
    console.log('\n✨ Database cleanup complete!')
  }
}

deleteOldGames().catch(console.error)
