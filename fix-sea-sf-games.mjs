import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cggoycedsybrajvdqjjk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTeams() {
  console.log('🔍 Checking SEA and SF in database...\n')

  const { data, error } = await supabase
    .from('teams')
    .select('id, key, name, city')
    .in('key', ['SEA', 'SF'])
    .order('key')

  if (error) {
    console.error('Error:', error)
    return null
  }

  console.log('Teams found:')
  console.log(JSON.stringify(data, null, 2))
  console.log('')

  return data
}

async function checkGames() {
  console.log('🔍 Checking for existing SEA/SF games in weeks 9, 12, 15...\n')

  // Week 9: SEA @ WSH
  const { data: week9 } = await supabase
    .from('games')
    .select('id, week, home_team_id, away_team_id')
    .eq('season_year', 2025)
    .eq('week', 9)
    .eq('home_team_id', 20) // WSH
    .eq('away_team_id', 32) // SEA

  console.log('Week 9 SEA @ WSH:', week9)

  // Week 12: SEA @ TEN
  const { data: week12 } = await supabase
    .from('games')
    .select('id, week, home_team_id, away_team_id')
    .eq('season_year', 2025)
    .eq('week', 12)
    .eq('home_team_id', 12) // TEN
    .eq('away_team_id', 32) // SEA

  console.log('Week 12 SEA @ TEN:', week12)

  // Week 15: TEN @ SF
  const { data: week15 } = await supabase
    .from('games')
    .select('id, week, home_team_id, away_team_id')
    .eq('season_year', 2025)
    .eq('week', 15)
    .eq('home_team_id', 31) // SF
    .eq('away_team_id', 12) // TEN

  console.log('Week 15 TEN @ SF:', week15)
}

async function main() {
  await checkTeams()
  await checkGames()
}

main().catch(console.error)
