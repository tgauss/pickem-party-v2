#!/usr/bin/env node
/**
 * Check for any tied games
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
  console.log('\n🔍 Checking for tied games in Weeks 1-4...\n')

  const games = await supabaseRequest('/rest/v1/games?season_year=eq.2025&week=lte.4&is_final=eq.true&select=*,home_team:teams!games_home_team_id_fkey(key,full_name),away_team:teams!games_away_team_id_fkey(key,full_name)&order=week.asc,game_time.asc')

  let tieCount = 0

  for (const game of games) {
    if (game.home_score === game.away_score) {
      tieCount++
      console.log(`Week ${game.week}: ${game.away_team.key} ${game.away_score} @ ${game.home_team.key} ${game.home_score} - TIE`)

      // Check if anyone picked either team
      const picks = await supabaseRequest(`/rest/v1/picks?game_id=eq.${game.id}&select=*,user:users(display_name,username),team:teams(key)`)

      if (picks.length > 0) {
        console.log('   Players affected:')
        for (const pick of picks) {
          console.log(`      - ${pick.user.display_name || pick.user.username} picked ${pick.team.key}`)
        }
      }
      console.log()
    }
  }

  if (tieCount === 0) {
    console.log('✅ No tied games found in Weeks 1-4\n')
  } else {
    console.log(`⚠️  Found ${tieCount} tied game(s)\n`)
  }
}

main().catch(console.error)
