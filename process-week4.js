#!/usr/bin/env node
/**
 * Week 4 Score Sync and Pick Processing Script
 *
 * This script:
 * 1. Fetches Week 4 NFL scores from ESPN API
 * 2. Updates game scores in the database
 * 3. Processes all Week 4 picks and updates user lives
 * 4. Reports elimination results
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
  console.log('🏈 Starting Week 4 Processing...\n')

  // Step 1: Fetch Week 4 scores from ESPN
  console.log('📊 Fetching Week 4 scores from ESPN...')
  const scoreboard = await espnRequest('/apis/site/v2/sports/football/nfl/scoreboard?dates=2025&seasontype=2&week=4')

  if (!scoreboard.events || scoreboard.events.length === 0) {
    console.error('❌ No Week 4 games found from ESPN')
    process.exit(1)
  }

  console.log(`✅ Found ${scoreboard.events.length} Week 4 games\n`)

  // Step 2: Get our games from database
  console.log('🔍 Fetching Week 4 games from database...')
  const dbGames = await supabaseRequest('/rest/v1/games?season_year=eq.2025&week=eq.4&select=*,home_team:teams!games_home_team_id_fkey(team_id,key,full_name),away_team:teams!games_away_team_id_fkey(team_id,key,full_name)')

  console.log(`✅ Found ${dbGames.length} Week 4 games in database\n`)

  // Step 3: Update scores
  console.log('🔄 Syncing scores...')
  let updatedCount = 0
  const finalGames = []

  for (const espnGame of scoreboard.events) {
    const competition = espnGame.competitions[0]
    const homeTeam = competition.competitors.find(c => c.homeAway === 'home')
    const awayTeam = competition.competitors.find(c => c.homeAway === 'away')
    const status = espnGame.status.type.state

    // Find matching game in our DB (key maps to ESPN abbreviation)
    const dbGame = dbGames.find(g =>
      g.home_team.key === homeTeam.team.abbreviation &&
      g.away_team.key === awayTeam.team.abbreviation
    )

    if (!dbGame) {
      console.log(`⚠️  Could not match: ${awayTeam.team.abbreviation} @ ${homeTeam.team.abbreviation}`)
      continue
    }

    const isFinal = status === 'post'

    if (isFinal) {
      const homeScore = parseInt(homeTeam.score)
      const awayScore = parseInt(awayTeam.score)

      // Update game in database
      await supabaseRequest(`/rest/v1/games?id=eq.${dbGame.id}`, {
        method: 'PATCH',
        body: {
          home_score: homeScore,
          away_score: awayScore,
          is_final: true
        }
      })

      finalGames.push({
        ...dbGame,
        home_score: homeScore,
        away_score: awayScore,
        is_final: true
      })

      const winner = homeScore > awayScore ? homeTeam.team.abbreviation : awayTeam.team.abbreviation
      console.log(`   ✓ ${awayTeam.team.abbreviation} ${awayScore} @ ${homeTeam.team.abbreviation} ${homeScore} - Final (${winner} wins)`)
      updatedCount++
    } else {
      console.log(`   ⏳ ${awayTeam.team.abbreviation} @ ${homeTeam.team.abbreviation} - ${status}`)
    }
  }

  console.log(`\n✅ Updated ${updatedCount} completed games\n`)

  if (finalGames.length === 0) {
    console.log('ℹ️  No completed games to process yet')
    return
  }

  // Step 4: Process picks for Week 4
  console.log('🎯 Processing Week 4 picks...\n')

  const picks = await supabaseRequest('/rest/v1/picks?week=eq.4&select=*,user:users(username,display_name),game:games(*,home_team:teams!games_home_team_id_fkey(team_id,key,full_name),away_team:teams!games_away_team_id_fkey(team_id,key,full_name))')

  console.log(`Found ${picks.length} Week 4 picks to process\n`)

  const results = {
    correct: [],
    incorrect: [],
    pending: []
  }

  for (const pick of picks) {
    const game = pick.game
    const user = pick.user

    // Fetch league member separately
    const members = await supabaseRequest(`/rest/v1/league_members?user_id=eq.${pick.user_id}&league_id=eq.${pick.league_id}`)
    const member = members[0]

    if (!member) {
      console.log(`   ⚠️  Could not find league member for ${user.username}`)
      continue
    }

    if (!game.is_final) {
      results.pending.push({ pick, user, game })
      continue
    }

    // Determine if pick was correct
    const homeWon = game.home_score > game.away_score
    const awayWon = game.away_score > game.home_score
    const playerPickedHome = game.home_team_id === pick.team_id
    const playerPickedAway = game.away_team_id === pick.team_id

    const isCorrect = (playerPickedHome && homeWon) || (playerPickedAway && awayWon)

    // Update pick with result
    await supabaseRequest(`/rest/v1/picks?id=eq.${pick.id}`, {
      method: 'PATCH',
      body: { is_correct: isCorrect }
    })

    if (isCorrect) {
      results.correct.push({ pick, user, game, member })
      console.log(`   ✅ ${user.display_name || user.username}: Picked ${playerPickedHome ? game.home_team.key : game.away_team.key} - CORRECT (${member.lives_remaining} lives)`)
    } else {
      const newLives = Math.max(0, member.lives_remaining - 1) // Don't go below 0
      const isEliminated = newLives <= 0

      // Update league member only if they weren't already eliminated
      if (member.lives_remaining > 0) {
        await supabaseRequest(`/rest/v1/league_members?user_id=eq.${pick.user_id}&league_id=eq.${pick.league_id}`, {
          method: 'PATCH',
          body: {
            lives_remaining: newLives,
            is_eliminated: isEliminated,
            eliminated_week: isEliminated ? 4 : member.eliminated_week
          }
        })
      }

      results.incorrect.push({ pick, user, game, member, newLives, isEliminated })

      if (isEliminated) {
        console.log(`   ❌💀 ${user.display_name || user.username}: Picked ${playerPickedHome ? game.home_team.key : game.away_team.key} - WRONG (${member.lives_remaining} → 0 lives) - ELIMINATED`)
      } else {
        console.log(`   ❌ ${user.display_name || user.username}: Picked ${playerPickedHome ? game.home_team.key : game.away_team.key} - WRONG (${member.lives_remaining} → ${newLives} lives)`)
      }
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 WEEK 4 PROCESSING COMPLETE')
  console.log('='.repeat(60))
  console.log(`✅ Correct picks: ${results.correct.length}`)
  console.log(`❌ Incorrect picks: ${results.incorrect.length}`)
  console.log(`⏳ Pending (games not final): ${results.pending.length}`)

  const eliminated = results.incorrect.filter(r => r.isEliminated)
  if (eliminated.length > 0) {
    console.log(`\n💀 NEW ELIMINATIONS (${eliminated.length}):`)
    eliminated.forEach(r => {
      console.log(`   - ${r.user.display_name || r.user.username}`)
    })
  }

  const livesLost = results.incorrect.filter(r => !r.isEliminated)
  if (livesLost.length > 0) {
    console.log(`\n⚠️  LOST A LIFE (${livesLost.length}):`)
    livesLost.forEach(r => {
      console.log(`   - ${r.user.display_name || r.user.username} (${r.newLives} ${r.newLives === 1 ? 'life' : 'lives'} remaining)`)
    })
  }

  console.log('\n✅ Week 4 processing complete!\n')
}

main().catch(err => {
  console.error('\n❌ Error:', err.message)
  process.exit(1)
})
