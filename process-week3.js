#!/usr/bin/env node
/**
 * Week 3 Score Sync and Pick Processing Script
 */

require('dotenv').config({ path: '.env.local' })
const https = require('https')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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
    if (options.body) req.write(JSON.stringify(options.body))
    req.end()
  })
}

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
  console.log('🏈 Processing Week 3...\n')

  // Fetch Week 3 scores from ESPN
  console.log('📊 Fetching Week 3 scores from ESPN...')
  const scoreboard = await espnRequest('/apis/site/v2/sports/football/nfl/scoreboard?dates=2025&seasontype=2&week=3')

  console.log(`✅ Found ${scoreboard.events.length} Week 3 games\n`)

  // Get our games from database
  const dbGames = await supabaseRequest('/rest/v1/games?season_year=eq.2025&week=eq.3&select=*,home_team:teams!games_home_team_id_fkey(team_id,key,full_name),away_team:teams!games_away_team_id_fkey(team_id,key,full_name)')

  console.log('🔄 Syncing scores...')
  let updatedCount = 0

  for (const espnGame of scoreboard.events) {
    const competition = espnGame.competitions[0]
    const homeTeam = competition.competitors.find(c => c.homeAway === 'home')
    const awayTeam = competition.competitors.find(c => c.homeAway === 'away')
    const status = espnGame.status.type.state

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

      await supabaseRequest(`/rest/v1/games?id=eq.${dbGame.id}`, {
        method: 'PATCH',
        body: {
          home_score: homeScore,
          away_score: awayScore,
          is_final: true
        }
      })

      const winner = homeScore > awayScore ? homeTeam.team.abbreviation : awayTeam.team.abbreviation
      console.log(`   ✓ ${awayTeam.team.abbreviation} ${awayScore} @ ${homeTeam.team.abbreviation} ${homeScore} - Final (${winner} wins)`)
      updatedCount++
    }
  }

  console.log(`\n✅ Updated ${updatedCount} completed games\n`)

  // Process picks
  console.log('🎯 Processing Week 3 picks...\n')

  const picks = await supabaseRequest('/rest/v1/picks?week=eq.3&select=*,user:users(username,display_name),game:games(*,home_team:teams!games_home_team_id_fkey(team_id,key,full_name),away_team:teams!games_away_team_id_fkey(team_id,key,full_name))')

  let correctCount = 0
  let incorrectCount = 0

  for (const pick of picks) {
    const game = pick.game
    const user = pick.user

    if (!game.is_final) continue

    const members = await supabaseRequest(`/rest/v1/league_members?user_id=eq.${pick.user_id}&league_id=eq.${pick.league_id}`)
    const member = members[0]

    const homeWon = game.home_score > game.away_score
    const awayWon = game.away_score > game.home_score
    const playerPickedHome = game.home_team_id === pick.team_id
    const isCorrect = (playerPickedHome && homeWon) || (!playerPickedHome && awayWon)

    // Update pick
    await supabaseRequest(`/rest/v1/picks?id=eq.${pick.id}`, {
      method: 'PATCH',
      body: { is_correct: isCorrect }
    })

    if (isCorrect) {
      correctCount++
      console.log(`   ✅ ${user.display_name || user.username}: CORRECT`)
    } else {
      incorrectCount++
      const newLives = Math.max(0, member.lives_remaining - 1)
      const isEliminated = newLives <= 0

      if (member.lives_remaining > 0) {
        await supabaseRequest(`/rest/v1/league_members?user_id=eq.${pick.user_id}&league_id=eq.${pick.league_id}`, {
          method: 'PATCH',
          body: {
            lives_remaining: newLives,
            is_eliminated: isEliminated,
            eliminated_week: isEliminated ? 3 : member.eliminated_week
          }
        })
      }

      console.log(`   ❌ ${user.display_name || user.username}: WRONG (${member.lives_remaining} → ${newLives} lives)${isEliminated ? ' - ELIMINATED' : ''}`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 WEEK 3 PROCESSING COMPLETE')
  console.log('='.repeat(60))
  console.log(`✅ Correct picks: ${correctCount}`)
  console.log(`❌ Incorrect picks: ${incorrectCount}`)
  console.log('\n✅ Week 3 processing complete!\n')
}

main().catch(err => {
  console.error('\n❌ Error:', err.message)
  process.exit(1)
})
