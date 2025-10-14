require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function addMissingMNFGame() {
  console.log('🏈 Adding missing CHI @ WSH Monday Night Football game to Week 6...\n')

  // Get team IDs
  const { data: teams } = await supabase
    .from('teams')
    .select('team_id, key, city, name')
    .in('key', ['CHI', 'WSH'])

  if (!teams || teams.length !== 2) {
    console.error('❌ Could not find both teams')
    return
  }

  const bears = teams.find(t => t.key === 'CHI')
  const commanders = teams.find(t => t.key === 'WSH')

  console.log(`✅ Found teams:`)
  console.log(`   ${bears.city} ${bears.name} (ID: ${bears.team_id})`)
  console.log(`   ${commanders.city} ${commanders.name} (ID: ${commanders.team_id})`)

  // Game details from ESPN
  const espnEventId = '401772717'
  const gameTime = '2025-10-14T00:15:00Z' // Monday, Oct 13 at 5:15 PM PT / 8:15 PM ET

  console.log(`\n📅 Game Details:`)
  console.log(`   Away: ${bears.city} ${bears.name}`)
  console.log(`   Home: ${commanders.city} ${commanders.name}`)
  console.log(`   Time: ${new Date(gameTime).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PT`)
  console.log(`   ESPN Event ID: ${espnEventId}`)

  // Check if game already exists
  const { data: existingGame } = await supabase
    .from('games')
    .select('*')
    .eq('espn_event_id', espnEventId)
    .single()

  if (existingGame) {
    console.log(`\n⚠️  Game already exists in database!`)
    console.log(`   Game ID: ${existingGame.id}`)
    return
  }

  // Insert the game
  const { data: newGame, error: insertError } = await supabase
    .from('games')
    .insert({
      season_year: 2025,
      week: 6,
      home_team_id: commanders.team_id,
      away_team_id: bears.team_id,
      game_time: gameTime,
      espn_event_id: espnEventId,
      is_final: false,
      home_score: null,
      away_score: null,
      game_status: 'Scheduled'
    })
    .select()
    .single()

  if (insertError) {
    console.error('❌ Error inserting game:', insertError)
    return
  }

  console.log(`\n✅ Game successfully added to database!`)
  console.log(`   Game ID: ${newGame.id}`)
  console.log(`\n🎉 The CHI @ WSH game is now available for Week 6 picks!`)

  // Verify the game count
  const { data: week6Games } = await supabase
    .from('games')
    .select('id')
    .eq('week', 6)
    .eq('season_year', 2025)

  console.log(`\n📊 Total Week 6 games in database: ${week6Games?.length || 0}`)
}

addMissingMNFGame().catch(console.error)
