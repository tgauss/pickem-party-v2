import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://cggoycedsybrajvdqjjk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'

const supabase = createClient(supabaseUrl, supabaseKey)

async function backupData() {
  console.log('💾 BACKING UP PICKS AND GAMES DATA\n')

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = './backup-' + timestamp

  // Create backup directory
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir)
  }

  console.log(`Created backup directory: ${backupDir}\n`)

  // Backup all 2025 games
  console.log('📦 Backing up games...')
  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select('*')
    .eq('season_year', 2025)
    .order('week', { ascending: true })
    .order('game_time', { ascending: true })

  if (gamesError) {
    console.error('Error fetching games:', gamesError)
    return
  }

  fs.writeFileSync(
    `${backupDir}/games-backup.json`,
    JSON.stringify(games, null, 2)
  )
  console.log(`   ✅ Saved ${games.length} games to games-backup.json`)

  // Backup all picks
  console.log('📦 Backing up picks...')
  const { data: picks, error: picksError } = await supabase
    .from('picks')
    .select('*')
    .order('week', { ascending: true })

  if (picksError) {
    console.error('Error fetching picks:', picksError)
    return
  }

  fs.writeFileSync(
    `${backupDir}/picks-backup.json`,
    JSON.stringify(picks, null, 2)
  )
  console.log(`   ✅ Saved ${picks.length} picks to picks-backup.json`)

  // Create a detailed report
  const report = {
    backup_date: new Date().toISOString(),
    total_games: games.length,
    total_picks: picks.length,
    games_by_week: {},
    picks_by_week: {},
    old_sportsdata_games: games.filter(g => g.sports_data_game_id !== null).length,
    espn_games: games.filter(g => g.espn_event_id !== null).length,
    picks_on_old_games: 0,
    picks_on_espn_games: 0
  }

  // Count by week
  for (let week = 1; week <= 18; week++) {
    const weekGames = games.filter(g => g.week === week)
    const weekPicks = picks.filter(p => p.week === week)

    if (weekGames.length > 0) {
      report.games_by_week[week] = weekGames.length
    }
    if (weekPicks.length > 0) {
      report.picks_by_week[week] = weekPicks.length
    }
  }

  // Categorize picks
  const oldGameIds = new Set(games.filter(g => g.sports_data_game_id !== null).map(g => g.id))
  const espnGameIds = new Set(games.filter(g => g.espn_event_id !== null).map(g => g.id))

  picks.forEach(pick => {
    if (oldGameIds.has(pick.game_id)) {
      report.picks_on_old_games++
    }
    if (espnGameIds.has(pick.game_id)) {
      report.picks_on_espn_games++
    }
  })

  fs.writeFileSync(
    `${backupDir}/backup-report.json`,
    JSON.stringify(report, null, 2)
  )
  console.log(`   ✅ Created backup report`)

  // Create a restore script
  const restoreScript = `import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = '${supabaseUrl}'
const supabaseKey = '${supabaseKey}'
const supabase = createClient(supabaseUrl, supabaseKey)

async function restore() {
  console.log('🔄 RESTORING FROM BACKUP\\n')

  const games = JSON.parse(fs.readFileSync('games-backup.json', 'utf8'))
  const picks = JSON.parse(fs.readFileSync('picks-backup.json', 'utf8'))

  console.log(\`Restoring \${games.length} games and \${picks.length} picks...\\n\`)

  // Delete current data
  console.log('🗑️  Deleting current picks...')
  await supabase.from('picks').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  console.log('🗑️  Deleting current games...')
  await supabase.from('games').delete().eq('season_year', 2025)

  // Restore games
  console.log('📦 Restoring games...')
  const { error: gamesError } = await supabase.from('games').insert(games)
  if (gamesError) {
    console.error('Error restoring games:', gamesError)
    return
  }

  // Restore picks
  console.log('📦 Restoring picks...')
  const { error: picksError } = await supabase.from('picks').insert(picks)
  if (picksError) {
    console.error('Error restoring picks:', picksError)
    return
  }

  console.log('\\n✅ RESTORE COMPLETE!')
}

restore().catch(console.error)
`

  fs.writeFileSync(
    `${backupDir}/restore.mjs`,
    restoreScript
  )
  console.log(`   ✅ Created restore script (restore.mjs)`)

  console.log('\n' + '='.repeat(70))
  console.log('📊 BACKUP SUMMARY')
  console.log('='.repeat(70))
  console.log(`Backup location: ${backupDir}`)
  console.log(`Total games backed up: ${games.length}`)
  console.log(`Total picks backed up: ${picks.length}`)
  console.log(`Old SportsData games: ${report.old_sportsdata_games}`)
  console.log(`ESPN games: ${report.espn_games}`)
  console.log(`Picks on old games: ${report.picks_on_old_games}`)
  console.log(`Picks on ESPN games: ${report.picks_on_espn_games}`)
  console.log('')
  console.log('Files created:')
  console.log('  - games-backup.json (all game data)')
  console.log('  - picks-backup.json (all pick data)')
  console.log('  - backup-report.json (summary)')
  console.log('  - restore.mjs (script to restore if needed)')
  console.log('')
  console.log('✅ BACKUP COMPLETE - Safe to proceed with migration!')
  console.log('')
  console.log('To restore: cd ' + backupDir + ' && node restore.mjs')
}

backupData().catch(console.error)
