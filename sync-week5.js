#!/usr/bin/env node
/**
 * Week 5 Schedule and Odds Sync Script
 *
 * This script:
 * 1. Checks if Week 5 games exist in database
 * 2. Fetches Week 5 schedule from ESPN if needed
 * 3. Updates betting lines for Week 5
 */

require('dotenv').config({ path: '.env.local' })
const https = require('https')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

// Helper to make Supabase requests
async function supabaseRequest(path, options = {}) {
  const url = new URL(path, SUPABASE_URL)

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': options.prefer || 'return=representation',
        ...options.headers
      }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`))
          } else {
            resolve(parsed)
          }
        } catch (e) {
          reject(e)
        }
      })
    })

    req.on('error', reject)

    if (options.body) {
      req.write(JSON.stringify(options.body))
    }
    req.end()
  })
}

// Helper to make ESPN requests
async function espnRequest(path) {
  return new Promise((resolve, reject) => {
    https.get(`https://site.api.espn.com${path}`, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', reject)
  })
}

async function main() {
  console.log('🏈 Starting Week 5 Sync...\n')

  // Step 1: Check if Week 5 games exist
  console.log('🔍 Checking for Week 5 games in database...')
  const existingGames = await supabaseRequest('/rest/v1/games?season_year=eq.2025&week=eq.5&select=*,home_team:teams!games_home_team_id_fkey(team_id,key,full_name),away_team:teams!games_away_team_id_fkey(team_id,key,full_name)')

  console.log(`Found ${existingGames.length} Week 5 games in database\n`)

  if (existingGames.length === 0) {
    console.log('⚠️  No Week 5 games found - fetching from ESPN...\n')

    // Step 2: Fetch Week 5 schedule from ESPN
    console.log('📥 Fetching Week 5 schedule from ESPN...')
    const scoreboard = await espnRequest('/apis/site/v2/sports/football/nfl/scoreboard?dates=2025&seasontype=2&week=5')

    if (!scoreboard.events || scoreboard.events.length === 0) {
      console.error('❌ No Week 5 games found from ESPN')
      process.exit(1)
    }

    console.log(`✅ Found ${scoreboard.events.length} Week 5 games from ESPN\n`)

    // Get team mappings
    const teams = await supabaseRequest('/rest/v1/teams?select=*')
    const teamMap = new Map()
    teams.forEach(team => {
      teamMap.set(team.key, team.team_id)
    })

    // Insert games
    console.log('💾 Inserting Week 5 games...')
    for (const event of scoreboard.events) {
      const competition = event.competitions[0]
      const homeTeam = competition.competitors.find(c => c.homeAway === 'home')
      const awayTeam = competition.competitors.find(c => c.homeAway === 'away')

      const homeTeamId = teamMap.get(homeTeam.team.abbreviation)
      const awayTeamId = teamMap.get(awayTeam.team.abbreviation)

      if (!homeTeamId || !awayTeamId) {
        console.log(`   ⚠️  Skipping: Unknown teams ${awayTeam.team.abbreviation} @ ${homeTeam.team.abbreviation}`)
        continue
      }

      await supabaseRequest('/rest/v1/games', {
        method: 'POST',
        prefer: 'return=minimal',
        body: {
          season_year: 2025,
          week: 5,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          game_time: event.date,
          is_final: false
        }
      })

      console.log(`   ✓ ${awayTeam.team.abbreviation} @ ${homeTeam.team.abbreviation} on ${new Date(event.date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}`)
    }

    console.log('\n✅ Week 5 schedule imported successfully\n')
  } else {
    console.log('✅ Week 5 games already exist in database\n')
  }

  // Step 3: Fetch and update betting lines
  console.log('📊 Fetching Week 5 betting lines from ESPN...')

  // Refresh games list
  const week5Games = await supabaseRequest('/rest/v1/games?season_year=eq.2025&week=eq.5&select=*,home_team:teams!games_home_team_id_fkey(team_id,key,full_name),away_team:teams!games_away_team_id_fkey(team_id,key,full_name)')

  let linesUpdated = 0

  for (const game of week5Games) {
    try {
      // Get game info from ESPN to find event ID
      const scoreboard = await espnRequest('/apis/site/v2/sports/football/nfl/scoreboard?dates=2025&seasontype=2&week=5')

      const espnGame = scoreboard.events.find(e => {
        const comp = e.competitions[0]
        const home = comp.competitors.find(c => c.homeAway === 'home')
        const away = comp.competitors.find(c => c.homeAway === 'away')
        return home.team.abbreviation === game.home_team.key && away.team.abbreviation === game.away_team.key
      })

      if (!espnGame) {
        console.log(`   ⚠️  Could not find ESPN data for ${game.away_team.key} @ ${game.home_team.key}`)
        continue
      }

      const eventId = espnGame.id

      // Fetch odds for this specific game
      const oddsData = await espnRequest(`/apis/site/v2/sports/football/nfl/scoreboard/${eventId}/odds`)

      if (oddsData.items && oddsData.items.length > 0) {
        const odds = oddsData.items[0]
        const spread = odds.spread || 0
        const overUnder = odds.overUnder || 0
        const homeMoneyLine = odds.homeTeamOdds?.moneyLine || 0
        const awayMoneyLine = odds.awayTeamOdds?.moneyLine || 0

        await supabaseRequest(`/rest/v1/games?id=eq.${game.id}`, {
          method: 'PATCH',
          body: {
            spread: spread,
            over_under: overUnder,
            home_money_line: homeMoneyLine,
            away_money_line: awayMoneyLine
          }
        })

        console.log(`   ✓ ${game.away_team.key} @ ${game.home_team.key}: Spread ${spread > 0 ? '+' : ''}${spread}, O/U ${overUnder}`)
        linesUpdated++
      } else {
        console.log(`   ⏳ ${game.away_team.key} @ ${game.home_team.key}: No odds available yet`)
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))

    } catch (err) {
      console.log(`   ❌ Error fetching odds for ${game.away_team.key} @ ${game.home_team.key}: ${err.message}`)
    }
  }

  console.log(`\n✅ Updated betting lines for ${linesUpdated} of ${week5Games.length} games\n`)

  // Summary
  console.log('='.repeat(60))
  console.log('📊 WEEK 5 SYNC COMPLETE')
  console.log('='.repeat(60))
  console.log(`✅ Week 5 games in database: ${week5Games.length}`)
  console.log(`✅ Betting lines updated: ${linesUpdated}`)
  console.log('\n🏈 System ready for Week 5 picks!\n')
}

main().catch(err => {
  console.error('\n❌ Error:', err.message)
  process.exit(1)
})
