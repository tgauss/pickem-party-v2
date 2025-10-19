// DELETE and RELOAD Week 7 Schedule from ESPN
import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'

const supabase = createClient(
  'https://cggoycedsybrajvdqjjk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
)

const teamMapping = {
  'ARI': 1, 'ATL': 2, 'BAL': 3, 'BUF': 4, 'CAR': 5, 'CHI': 6,
  'CIN': 7, 'CLE': 8, 'DAL': 9, 'DEN': 10, 'DET': 11, 'GB': 12,
  'HOU': 13, 'IND': 14, 'JAX': 15, 'KC': 16, 'LAC': 17, 'LAR': 18,
  'LV': 19, 'MIA': 20, 'MIN': 21, 'NE': 22, 'NO': 23, 'NYG': 24,
  'NYJ': 25, 'PHI': 26, 'PIT': 27, 'SEA': 28, 'SF': 29, 'TB': 30,
  'TEN': 33, 'WAS': 34
}

console.log('🗑️  DELETING OLD WEEK 7 GAMES...')

// Delete existing Week 7 games
const { error: deleteError } = await supabase
  .from('games')
  .delete()
  .eq('season_year', 2025)
  .eq('week', 7)

if (deleteError) {
  console.error('Error deleting:', deleteError)
  process.exit(1)
}

console.log('✅ Old games deleted\n')

console.log('📥 FETCHING WEEK 7 FROM ESPN...\n')

// Fetch Week 7 from ESPN
const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=7&seasontype=2&dates=2025')
const data = await response.json()

console.log(`Found ${data.events.length} games\n`)

const newGames = []

for (const event of data.events) {
  const comp = event.competitions[0]
  const home = comp.competitors.find(c => c.homeAway === 'home')
  const away = comp.competitors.find(c => c.homeAway === 'away')

  const homeId = teamMapping[home.team.abbreviation]
  const awayId = teamMapping[away.team.abbreviation]

  if (!homeId || !awayId) {
    console.log(`⚠️  Skip: ${away.team.abbreviation} @ ${home.team.abbreviation} - unknown team`)
    continue
  }

  const gameTime = event.date
  const pdt = new Date(gameTime).toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })

  newGames.push({
    season_year: 2025,
    week: 7,
    home_team_id: homeId,
    away_team_id: awayId,
    game_time: gameTime,
    is_final: false,
    espn_event_id: event.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_updated: new Date().toISOString()
  })

  console.log(`✅ ${pdt}: ${away.team.abbreviation} @ ${home.team.abbreviation}`)
}

console.log(`\n💾 INSERTING ${newGames.length} GAMES...\n`)

const { data: inserted, error: insertError } = await supabase
  .from('games')
  .insert(newGames)
  .select()

if (insertError) {
  console.error('❌ Error inserting:', insertError)
  process.exit(1)
}

console.log(`✅ Inserted ${inserted.length} games`)

// Show final schedule
const { data: games } = await supabase
  .from('games')
  .select(`
    *,
    home_team:teams!games_home_team_id_fkey(key),
    away_team:teams!games_away_team_id_fkey(key)
  `)
  .eq('season_year', 2025)
  .eq('week', 7)
  .order('game_time')

console.log(`\n📅 WEEK 7 SCHEDULE (${games.length} games):`)
const now = new Date()
games.forEach(g => {
  const home = Array.isArray(g.home_team) ? g.home_team[0] : g.home_team
  const away = Array.isArray(g.away_team) ? g.away_team[0] : g.away_team
  const time = new Date(g.game_time)
  const pdt = time.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
  const started = time <= now
  console.log(`${started ? '🔒 LOCKED' : '✅ OPEN  '}: ${pdt} - ${away.key} @ ${home.key}`)
})

console.log('\n✨ Week 7 schedule reloaded!')
