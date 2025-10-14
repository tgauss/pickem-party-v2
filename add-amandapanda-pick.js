require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function addAmandapandaPick() {
  console.log('🏈 Adding amandapanda\'s Week 6 pick for Green Bay Packers...\n')

  // 1. Find amandapanda's user info
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, username, display_name')
    .or('username.ilike.%amandapanda%,display_name.ilike.%amandapanda%')

  if (userError || !users || users.length === 0) {
    console.error('❌ Could not find user amandapanda:', userError)
    return
  }

  const user = users[0]
  console.log(`✅ Found user: ${user.display_name} (${user.username})`)
  console.log(`   User ID: ${user.id}\n`)

  // 2. Find their league membership
  const { data: memberships, error: memberError } = await supabase
    .from('league_members')
    .select(`
      id,
      league_id,
      lives_remaining,
      is_eliminated,
      leagues (
        name,
        slug
      )
    `)
    .eq('user_id', user.id)

  if (memberError || !memberships || memberships.length === 0) {
    console.error('❌ Could not find league membership:', memberError)
    return
  }

  const membership = memberships[0]
  console.log(`✅ League: ${membership.leagues.name}`)
  console.log(`   Lives: ${membership.lives_remaining}`)
  console.log(`   League ID: ${membership.league_id}\n`)

  // 3. Find Green Bay Packers team_id
  const { data: teams, error: teamError } = await supabase
    .from('teams')
    .select('team_id, city, name, full_name')
    .ilike('name', '%packers%')

  if (teamError || !teams || teams.length === 0) {
    console.error('❌ Could not find Packers:', teamError)
    return
  }

  const packers = teams[0]
  console.log(`✅ Found team: ${packers.full_name}`)
  console.log(`   Team ID: ${packers.team_id}\n`)

  // 4. Find Week 6 game involving Packers
  const { data: games, error: gameError } = await supabase
    .from('games')
    .select(`
      id,
      week,
      season_year,
      home_team_id,
      away_team_id,
      game_time,
      home_score,
      away_score,
      is_final,
      home_team:teams!games_home_team_id_fkey(city, name),
      away_team:teams!games_away_team_id_fkey(city, name)
    `)
    .eq('week', 6)
    .eq('season_year', 2025)
    .or(`home_team_id.eq.${packers.team_id},away_team_id.eq.${packers.team_id}`)

  if (gameError || !games || games.length === 0) {
    console.error('❌ Could not find Week 6 Packers game:', gameError)
    return
  }

  const game = games[0]
  console.log(`✅ Found game: ${game.away_team.city} ${game.away_team.name} @ ${game.home_team.city} ${game.home_team.name}`)
  console.log(`   Game time: ${new Date(game.game_time).toLocaleString()}`)
  console.log(`   Game ID: ${game.id}`)
  console.log(`   Is Final: ${game.is_final}\n`)

  // 5. Check if pick already exists
  const { data: existingPicks, error: checkError } = await supabase
    .from('picks')
    .select('*')
    .eq('user_id', user.id)
    .eq('league_id', membership.league_id)
    .eq('week', 6)

  if (checkError) {
    console.error('❌ Error checking existing picks:', checkError)
    return
  }

  if (existingPicks && existingPicks.length > 0) {
    console.log('⚠️  User already has a Week 6 pick!')
    console.log('   Existing pick details:', existingPicks[0])

    // Ask if we should update it
    console.log('\n🔄 Updating existing pick to Packers...')

    const { data: updatedPick, error: updateError } = await supabase
      .from('picks')
      .update({
        game_id: game.id,
        team_id: packers.team_id,
        submitted_at: new Date().toISOString()
      })
      .eq('id', existingPicks[0].id)
      .select()

    if (updateError) {
      console.error('❌ Error updating pick:', updateError)
      return
    }

    console.log('✅ Pick updated successfully!')
    console.log(updatedPick)
    return
  }

  // 6. Insert the new pick
  const { data: newPick, error: insertError } = await supabase
    .from('picks')
    .insert({
      user_id: user.id,
      league_id: membership.league_id,
      game_id: game.id,
      team_id: packers.team_id,
      week: 6,
      is_correct: null,
      submitted_at: new Date().toISOString()
    })
    .select()

  if (insertError) {
    console.error('❌ Error inserting pick:', insertError)
    return
  }

  console.log('✅ Pick successfully added!')
  console.log('\n📋 Pick Summary:')
  console.log(`   Player: ${user.display_name}`)
  console.log(`   Week: 6`)
  console.log(`   Team: ${packers.full_name}`)
  console.log(`   Game: ${game.away_team.city} ${game.away_team.name} @ ${game.home_team.city} ${game.home_team.name}`)
  console.log(`   Game Time: ${new Date(game.game_time).toLocaleString()}`)
  console.log('\n🎉 Done!')
}

addAmandapandaPick().catch(console.error)
