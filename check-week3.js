#!/usr/bin/env node
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
  const week3Games = await supabaseRequest('/rest/v1/games?season_year=eq.2025&week=eq.3&select=*,home_team:teams!games_home_team_id_fkey(key),away_team:teams!games_away_team_id_fkey(key)&order=game_time.asc')

  console.log('\n🏈 WEEK 3 GAMES STATUS\n')
  console.log('='.repeat(80))

  for (const game of week3Games) {
    console.log(`${game.away_team.key} @ ${game.home_team.key}: ${game.is_final ? `FINAL ${game.away_score}-${game.home_score}` : 'NOT FINAL'}`)
  }

  console.log('\n' + '='.repeat(80) + '\n')
}

main().catch(console.error)
