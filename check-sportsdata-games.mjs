import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cggoycedsybrajvdqjjk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSportsDataGames() {
  console.log('🔍 CHECKING FOR OLD SPORTSDATA.IO GAMES\n')

  // Count games with sports_data_game_id
  const { count: oldGamesCount } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true })
    .eq('season_year', 2025)
    .not('sports_data_game_id', 'is', null)

  // Count games with espn_event_id
  const { count: espnGamesCount } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true })
    .eq('season_year', 2025)
    .not('espn_event_id', 'is', null)

  // Total games
  const { count: totalGamesCount } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true })
    .eq('season_year', 2025)

  console.log('📊 SUMMARY:')
  console.log(`Total 2025 games: ${totalGamesCount}`)
  console.log(`Games with espn_event_id: ${espnGamesCount}`)
  console.log(`Games with sports_data_game_id: ${oldGamesCount}`)
  console.log('')

  // Check by week
  console.log('📅 BY WEEK:')
  for (let week = 1; week <= 18; week++) {
    const { count: weekTotal } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .eq('season_year', 2025)
      .eq('week', week)

    const { count: weekOld } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .eq('season_year', 2025)
      .eq('week', week)
      .not('sports_data_game_id', 'is', null)

    const { count: weekEspn } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .eq('season_year', 2025)
      .eq('week', week)
      .not('espn_event_id', 'is', null)

    if (weekTotal > 0) {
      const status = weekOld > 0 ? '⚠️  HAS OLD DATA' : '✅'
      console.log(`   Week ${week.toString().padStart(2)}: ${weekTotal.toString().padStart(2)} total, ${weekEspn.toString().padStart(2)} ESPN, ${weekOld.toString().padStart(2)} old ${status}`)
    }
  }

  // Check if any old games have picks
  console.log('\n🔍 Checking if old games have picks...')

  const { data: oldGames } = await supabase
    .from('games')
    .select('id, week')
    .eq('season_year', 2025)
    .not('sports_data_game_id', 'is', null)

  if (oldGames && oldGames.length > 0) {
    const oldGameIds = oldGames.map(g => g.id)

    const { data: picks } = await supabase
      .from('picks')
      .select('id, game_id, week')
      .in('game_id', oldGameIds)

    if (picks && picks.length > 0) {
      console.log(`\n⚠️  WARNING: ${picks.length} picks reference old SportsData games!`)

      // Group by week
      const picksByWeek = {}
      picks.forEach(p => {
        if (!picksByWeek[p.week]) picksByWeek[p.week] = 0
        picksByWeek[p.week]++
      })

      console.log('Picks by week:')
      Object.keys(picksByWeek).sort().forEach(week => {
        console.log(`   Week ${week}: ${picksByWeek[week]} picks`)
      })
    } else {
      console.log('\n✅ No picks reference old SportsData games - SAFE TO DELETE!')
    }
  }
}

checkSportsDataGames().catch(console.error)
