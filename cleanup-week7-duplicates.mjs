import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cggoycedsybrajvdqjjk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'

const supabase = createClient(supabaseUrl, supabaseKey)

// Real ESPN Week 7 matchups (from our earlier check)
const realWeek7Matchups = [
  { away: 'PIT', home: 'CIN' },  // Thu Oct 16
  { away: 'LAR', home: 'JAX' },  // Sun Oct 19 (London)
  { away: 'NO', home: 'CHI' },
  { away: 'MIA', home: 'CLE' },
  { away: 'NE', home: 'TEN' },
  { away: 'LV', home: 'KC' },
  { away: 'PHI', home: 'MIN' },
  { away: 'CAR', home: 'NYJ' },
  { away: 'NYG', home: 'DEN' },
  { away: 'IND', home: 'LAC' },
  { away: 'WSH', home: 'DAL' },
  { away: 'GB', home: 'ARI' },
  { away: 'ATL', home: 'SF' },
  { away: 'TB', home: 'DET' },   // Mon Oct 20
  { away: 'HOU', home: 'SEA' }   // Mon Oct 20
]

async function cleanupWeek7() {
  console.log('🧹 CLEANING UP WEEK 7 DUPLICATE GAMES\n')

  // Get all Week 7 games
  const { data: allGames, error } = await supabase
    .from('games')
    .select(`
      id,
      espn_event_id,
      game_time,
      home_team_id,
      away_team_id,
      home:teams!games_home_team_id_fkey(key, name),
      away:teams!games_away_team_id_fkey(key, name)
    `)
    .eq('season_year', 2025)
    .eq('week', 7)
    .order('game_time')

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`Found ${allGames.length} total Week 7 games in database\n`)

  // Check which games have picks
  const { data: picks } = await supabase
    .from('picks')
    .select('game_id, team_id')
    .eq('week', 7)

  const gameIdsWithPicks = new Set(picks.map(p => p.game_id))
  console.log(`${picks.length} picks reference ${gameIdsWithPicks.size} different games\n`)

  // Categorize games
  const realGames = []
  const duplicateGames = []
  const unknownGames = []

  for (const game of allGames) {
    const homeKey = game.home?.key
    const awayKey = game.away?.key
    const hasPicks = gameIdsWithPicks.has(game.id)

    // Check if this is a real Week 7 matchup
    const isReal = realWeek7Matchups.some(
      m => m.home === homeKey && m.away === awayKey
    )

    if (isReal) {
      realGames.push({ ...game, homeKey, awayKey, hasPicks })
    } else if (hasPicks) {
      // Not a real matchup but has picks - keep it!
      unknownGames.push({ ...game, homeKey, awayKey, hasPicks })
    } else {
      // Not real and no picks - safe to delete
      duplicateGames.push({ ...game, homeKey, awayKey, hasPicks })
    }
  }

  console.log('='.repeat(70))
  console.log('📊 CATEGORIZATION')
  console.log('='.repeat(70))
  console.log(`✅ Real ESPN Week 7 games: ${realGames.length}`)
  console.log(`⚠️  Games with picks (keep): ${unknownGames.length}`)
  console.log(`❌ Duplicates to delete: ${duplicateGames.length}\n`)

  if (realGames.length > 0) {
    console.log('\n✅ REAL ESPN WEEK 7 GAMES (KEEP):')
    realGames.forEach(g => {
      const pickStatus = g.hasPicks ? '📝 HAS PICKS' : 'No picks'
      console.log(`   ${g.awayKey} @ ${g.homeKey} - ${pickStatus}`)
    })
  }

  if (unknownGames.length > 0) {
    console.log('\n⚠️  GAMES WITH PICKS (NOT REAL MATCHUPS BUT KEEPING):')
    unknownGames.forEach(g => {
      console.log(`   ${g.awayKey} @ ${g.homeKey} - 📝 HAS PICKS`)
    })
  }

  if (duplicateGames.length > 0) {
    console.log('\n❌ DUPLICATES TO DELETE (NO PICKS):')
    duplicateGames.forEach(g => {
      console.log(`   ${g.awayKey} @ ${g.homeKey} - ID: ${g.id}`)
    })

    console.log('\n🗑️  DELETING DUPLICATES...')

    for (const game of duplicateGames) {
      const { error: deleteError } = await supabase
        .from('games')
        .delete()
        .eq('id', game.id)

      if (deleteError) {
        console.log(`   ❌ Failed to delete ${game.awayKey} @ ${game.homeKey}: ${deleteError.message}`)
      } else {
        console.log(`   ✅ Deleted ${game.awayKey} @ ${game.homeKey}`)
      }
    }
  }

  console.log('\n' + '='.repeat(70))
  console.log('✨ CLEANUP COMPLETE')
  console.log('='.repeat(70))
  console.log(`Kept: ${realGames.length + unknownGames.length} games`)
  console.log(`Deleted: ${duplicateGames.length} duplicates`)
}

cleanupWeek7().catch(console.error)
