#!/usr/bin/env node
/**
 * Check specific player picks
 */

require('dotenv').config({ path: '.env.local' })
const https = require('https')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function supabaseRequest(path) {
  const url = new URL(path, SUPABASE_URL)
  return new Promise((resolve, reject) => {
    https.get({
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(JSON.parse(data)))
    }).on('error', reject)
  })
}

async function main() {
  // Get the specific users
  const users = await supabaseRequest('/rest/v1/users?or=(display_name.eq.Hayden Gaussoin,display_name.eq.Taylor Gaussoin,display_name.eq.CoDore)&select=*')

  console.log('\n📋 DETAILED PICK HISTORY\n')
  console.log('='.repeat(80))

  for (const user of users) {
    console.log(`\n👤 ${user.display_name || user.username}`)
    console.log('-'.repeat(80))

    // Get their league member info
    const members = await supabaseRequest(`/rest/v1/league_members?user_id=eq.${user.id}&select=*`)
    const member = members[0]

    console.log(`   Lives Remaining: ${member.lives_remaining}`)
    console.log(`   Eliminated: ${member.is_eliminated ? 'YES' : 'NO'}${member.eliminated_week ? ` (Week ${member.eliminated_week})` : ''}`)
    console.log()

    // Get all their picks
    const picks = await supabaseRequest(`/rest/v1/picks?user_id=eq.${user.id}&select=*,team:teams(key,full_name),game:games(*,home_team:teams!games_home_team_id_fkey(key,full_name),away_team:teams!games_away_team_id_fkey(key,full_name))&order=week.asc`)

    for (const pick of picks) {
      const game = pick.game
      const team = pick.team
      const homeWon = game.home_score > game.away_score
      const awayWon = game.away_score > game.home_score
      const pickedHome = game.home_team_id === pick.team_id

      let result = '⏳ Pending'
      if (game.is_final) {
        result = pick.is_correct ? '✅ CORRECT' : '❌ WRONG'
      }

      console.log(`   Week ${pick.week}: Picked ${team.key} (${team.full_name})`)
      console.log(`      Game: ${game.away_team.key} @ ${game.home_team.key}`)
      if (game.is_final) {
        console.log(`      Score: ${game.away_team.key} ${game.away_score} - ${game.home_team.key} ${game.home_score}`)
        console.log(`      Winner: ${homeWon ? game.home_team.key : game.away_team.key}`)
      }
      console.log(`      Result: ${result}`)
      console.log()
    }
  }

  console.log('='.repeat(80) + '\n')
}

main().catch(console.error)
