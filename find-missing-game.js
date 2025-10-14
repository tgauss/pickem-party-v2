require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function findMissingGame() {
  console.log('🔍 Searching for Bears vs Commanders game...\n')

  // Check ESPN API for current week
  console.log('📡 Checking ESPN API for this week...')
  const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard')
  const data = await response.json()

  console.log(`ESPN current week: ${data.week?.number || 'unknown'}`)
  console.log(`\nGames on ESPN scoreboard:`)

  let foundBearsCommanders = false

  data.events?.forEach(event => {
    const comp = event.competitions?.[0]
    if (!comp) return

    const home = comp.competitors.find(c => c.homeAway === 'home')
    const away = comp.competitors.find(c => c.homeAway === 'away')

    if (home && away) {
      const awayKey = away.team.abbreviation
      const homeKey = home.team.abbreviation
      console.log(`  ${awayKey} @ ${homeKey}`)

      if ((awayKey === 'CHI' && homeKey === 'WSH') || (awayKey === 'WSH' && homeKey === 'CHI')) {
        foundBearsCommanders = true
        console.log(`    ⚠️  FOUND: CHI @ WSH game!`)
        console.log(`    ESPN Event ID: ${event.id}`)
        console.log(`    Date: ${event.date}`)
        console.log(`    Status: ${event.status.type.description}`)
      }
    }
  })

  if (!foundBearsCommanders) {
    console.log('\n❌ CHI @ WSH not on ESPN scoreboard')
  }

  // Check our database for all Commanders and Bears games
  console.log('\n\n🗄️  Checking database for Commanders games...')
  const { data: commandersGames } = await supabase
    .from('games')
    .select(`
      *,
      home_team:teams!games_home_team_id_fkey(city, name, key),
      away_team:teams!games_away_team_id_fkey(city, name, key)
    `)
    .eq('season_year', 2025)
    .or('home_team:teams!games_home_team_id_fkey.key.eq.WSH,away_team:teams!games_away_team_id_fkey.key.eq.WSH')
    .order('week', { ascending: true })

  if (commandersGames && commandersGames.length > 0) {
    console.log(`\nFound ${commandersGames.length} Commanders games:`)
    commandersGames.forEach(g => {
      console.log(`  Week ${g.week}: ${g.away_team.key} @ ${g.home_team.key}`)
    })
  }

  console.log('\n\n🗄️  Checking database for Bears games...')
  const { data: bearsGames } = await supabase
    .from('games')
    .select(`
      *,
      home_team:teams!games_home_team_id_fkey(city, name, key),
      away_team:teams!games_away_team_id_fkey(city, name, key)
    `)
    .eq('season_year', 2025)
    .or('home_team:teams!games_home_team_id_fkey.key.eq.CHI,away_team:teams!games_away_team_id_fkey.key.eq.CHI')
    .order('week', { ascending: true })

  if (bearsGames && bearsGames.length > 0) {
    console.log(`\nFound ${bearsGames.length} Bears games:`)
    bearsGames.forEach(g => {
      console.log(`  Week ${g.week}: ${g.away_team.key} @ ${g.home_team.key}`)
    })
  }

  // Check what teams we have
  console.log('\n\n🏈 Checking team keys in database...')
  const { data: teams } = await supabase
    .from('teams')
    .select('key, city, name')
    .or('key.eq.WSH,key.eq.CHI')

  console.log('Teams found:')
  teams?.forEach(t => {
    console.log(`  ${t.key}: ${t.city} ${t.name}`)
  })
}

findMissingGame().catch(console.error)
