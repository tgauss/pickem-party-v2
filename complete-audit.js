#!/usr/bin/env node
/**
 * Complete Audit - All picks + missing picks considered
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
  console.log('🔍 COMPLETE AUDIT - All Picks + Missing Picks = Lives Lost')
  console.log('='.repeat(100))

  const members = await supabaseRequest('/rest/v1/league_members?select=*,user:users(id,username,display_name)&order=user(display_name).asc')

  console.log(`\nTotal Players: ${members.length}\n`)

  const corrections = []

  for (const member of members) {
    const user = member.user
    const displayName = user.display_name || user.username

    // Get all picks for this user
    const picks = await supabaseRequest(`/rest/v1/picks?user_id=eq.${user.id}&select=*,team:teams(key,full_name),game:games(*,home_team:teams!games_home_team_id_fkey(key,full_name),away_team:teams!games_away_team_id_fkey(key,full_name))&order=week.asc`)

    // Track which weeks have picks
    const weeksWithPicks = new Set(picks.map(p => p.week))

    // Count wrong picks (lives lost from incorrect picks)
    let livesLostFromWrongPicks = 0
    const wrongWeeks = []

    for (const pick of picks) {
      const game = pick.game
      if (game.is_final) {
        const homeWon = game.home_score > game.away_score
        const awayWon = game.away_score > game.home_score
        const pickedHome = game.home_team_id === pick.team_id
        const shouldBeCorrect = (pickedHome && homeWon) || (!pickedHome && awayWon)

        if (!shouldBeCorrect) {
          livesLostFromWrongPicks++
          wrongWeeks.push(`Week ${pick.week}: ${pick.team.key}`)
        }
      }
    }

    // Count missing picks (lives lost from no pick)
    const missingWeeks = []
    for (let week = 1; week <= 4; week++) {
      if (!weeksWithPicks.has(week)) {
        missingWeeks.push(week)
      }
    }
    const livesLostFromMissingPicks = missingWeeks.length

    // Total lives lost
    const totalLivesLost = livesLostFromWrongPicks + livesLostFromMissingPicks
    const expectedLives = Math.max(0, 2 - totalLivesLost)
    const actualLives = member.lives_remaining
    const shouldBeEliminated = expectedLives === 0
    const actuallyEliminated = member.is_eliminated

    const hasIssue = (expectedLives !== actualLives) || (shouldBeEliminated !== actuallyEliminated)

    if (hasIssue || missingWeeks.length > 0 || livesLostFromWrongPicks > 0) {
      console.log('─'.repeat(100))
      console.log(`👤 ${displayName}`)

      if (wrongWeeks.length > 0) {
        console.log(`   ❌ Wrong picks: ${wrongWeeks.join(', ')}`)
      }

      if (missingWeeks.length > 0) {
        console.log(`   ⏸️  Missing picks: Week ${missingWeeks.join(', ')}`)
      }

      console.log(`\n   📊 Lives Calculation:`)
      console.log(`      Starting: 2`)
      console.log(`      Lost from wrong picks: -${livesLostFromWrongPicks}`)
      console.log(`      Lost from missing picks: -${livesLostFromMissingPicks}`)
      console.log(`      Total lost: -${totalLivesLost}`)
      console.log(`      Expected lives: ${expectedLives}`)
      console.log(`      Actual in DB: ${actualLives}`)

      if (expectedLives !== actualLives) {
        console.log(`      ⚠️  MISMATCH! Lives should be ${expectedLives}`)
        corrections.push({
          user: displayName,
          userId: user.id,
          currentLives: actualLives,
          correctLives: expectedLives,
          currentEliminated: actuallyEliminated,
          shouldBeEliminated
        })
      } else {
        console.log(`      ✅ Lives correct`)
      }

      console.log(`\n   Elimination:`)
      console.log(`      Should be eliminated: ${shouldBeEliminated ? 'YES' : 'NO'}`)
      console.log(`      Actually eliminated: ${actuallyEliminated ? 'YES' : 'NO'}`)

      if (shouldBeEliminated !== actuallyEliminated) {
        console.log(`      ⚠️  ELIMINATION STATUS MISMATCH!`)
      } else {
        console.log(`      ✅ Elimination status correct`)
      }
    }
  }

  console.log('\n' + '='.repeat(100))
  console.log('📊 CORRECTIONS NEEDED')
  console.log('='.repeat(100))

  if (corrections.length === 0) {
    console.log('\n✅ All player lives and elimination statuses are correct!\n')
  } else {
    console.log(`\n⚠️  Found ${corrections.length} player(s) needing corrections:\n`)

    for (const correction of corrections) {
      console.log(`   ${correction.user}:`)
      console.log(`      Current: ${correction.currentLives} lives, ${correction.currentEliminated ? 'ELIMINATED' : 'ALIVE'}`)
      console.log(`      Correct: ${correction.correctLives} lives, ${correction.shouldBeEliminated ? 'ELIMINATED' : 'ALIVE'}`)
      console.log()
    }
  }

  console.log('='.repeat(100) + '\n')
}

main().catch(console.error)
