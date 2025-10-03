#!/usr/bin/env node
/**
 * Complete Pick Audit - Week by Week Analysis
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
  console.log('\n' + '='.repeat(100))
  console.log('🔍 COMPLETE PICK AUDIT - ALL PLAYERS, ALL WEEKS')
  console.log('='.repeat(100))

  // Get all league members
  const members = await supabaseRequest('/rest/v1/league_members?select=*,user:users(id,username,display_name)&order=user(display_name).asc')

  console.log(`\nTotal Players: ${members.length}\n`)

  for (const member of members) {
    const user = member.user
    const displayName = user.display_name || user.username

    console.log('\n' + '─'.repeat(100))
    console.log(`👤 ${displayName}`)
    console.log('─'.repeat(100))

    // Get all picks for this user, ordered by week
    const picks = await supabaseRequest(`/rest/v1/picks?user_id=eq.${user.id}&select=*,team:teams(key,full_name),game:games(*,home_team:teams!games_home_team_id_fkey(key,full_name),away_team:teams!games_away_team_id_fkey(key,full_name))&order=week.asc`)

    if (picks.length === 0) {
      console.log('   No picks made')
      continue
    }

    // Track lives lost per week
    let livesLost = 0
    const weekResults = []

    for (const pick of picks) {
      const game = pick.game
      const team = pick.team

      let resultSymbol = '⏳'
      let resultText = 'PENDING'
      let livesChange = ''

      if (game.is_final) {
        const homeWon = game.home_score > game.away_score
        const awayWon = game.away_score > game.home_score
        const pickedHome = game.home_team_id === pick.team_id

        // Calculate if pick should be correct
        const shouldBeCorrect = (pickedHome && homeWon) || (!pickedHome && awayWon)

        if (pick.is_correct === shouldBeCorrect) {
          // Database matches calculation
          if (pick.is_correct) {
            resultSymbol = '✅'
            resultText = 'CORRECT'
          } else {
            resultSymbol = '❌'
            resultText = 'WRONG'
            livesLost++
            livesChange = ` (-1 life, total lost: ${livesLost})`
          }
        } else {
          // MISMATCH - database doesn't match calculation
          resultSymbol = '⚠️'
          resultText = `MISMATCH! DB says ${pick.is_correct ? 'CORRECT' : 'WRONG'}, but should be ${shouldBeCorrect ? 'CORRECT' : 'WRONG'}`
          if (!shouldBeCorrect) {
            livesLost++
            livesChange = ` (should lose life, total: ${livesLost})`
          }
        }
      }

      const gameResult = game.is_final
        ? `${game.away_team.key} ${game.away_score} @ ${game.home_team.key} ${game.home_score} (Winner: ${game.home_score > game.away_score ? game.home_team.key : game.away_team.key})`
        : 'Game not final'

      weekResults.push({
        week: pick.week,
        team: team.key,
        teamName: team.full_name,
        game: gameResult,
        result: `${resultSymbol} ${resultText}${livesChange}`,
        isFinal: game.is_final,
        isCorrect: pick.is_correct
      })
    }

    // Display week by week
    for (const result of weekResults) {
      console.log(`\n   Week ${result.week}: ${result.team} (${result.teamName})`)
      console.log(`      Game: ${result.game}`)
      console.log(`      Result: ${result.result}`)
    }

    // Calculate expected lives
    const startingLives = 2
    const expectedLives = Math.max(0, startingLives - livesLost)
    const actualLives = member.lives_remaining
    const shouldBeEliminated = expectedLives === 0

    console.log('\n   ' + '─'.repeat(96))
    console.log(`   SUMMARY:`)
    console.log(`      Starting Lives: ${startingLives}`)
    console.log(`      Lives Lost: ${livesLost}`)
    console.log(`      Expected Lives: ${expectedLives}`)
    console.log(`      Actual Lives in DB: ${actualLives}`)

    if (expectedLives !== actualLives) {
      console.log(`      ⚠️  MISMATCH! Lives should be ${expectedLives} but DB shows ${actualLives}`)
    } else {
      console.log(`      ✅ Lives match!`)
    }

    console.log(`      Should be eliminated: ${shouldBeEliminated ? 'YES' : 'NO'}`)
    console.log(`      Actually eliminated: ${member.is_eliminated ? 'YES' : 'NO'}`)

    if (shouldBeEliminated !== member.is_eliminated) {
      console.log(`      ⚠️  ELIMINATION STATUS MISMATCH!`)
    } else {
      console.log(`      ✅ Elimination status correct!`)
    }
  }

  console.log('\n' + '='.repeat(100))
  console.log('📊 AUDIT COMPLETE')
  console.log('='.repeat(100) + '\n')
}

main().catch(console.error)
