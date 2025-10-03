#!/usr/bin/env node
/**
 * Generate table view of all picks for all players
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

function padRight(str, len) {
  return (str + ' '.repeat(len)).substring(0, len)
}

function padLeft(str, len) {
  return (' '.repeat(len) + str).substring(str.length)
}

async function main() {
  console.log('\n' + '='.repeat(140))
  console.log('📊 COMPLETE PICK TABLE - ALL PLAYERS, ALL WEEKS')
  console.log('='.repeat(140))

  const members = await supabaseRequest('/rest/v1/league_members?select=*,user:users(id,username,display_name)&order=user(display_name).asc')

  const tableData = []

  for (const member of members) {
    const user = member.user
    const displayName = user.display_name || user.username

    // Get all picks for this user
    const picks = await supabaseRequest(`/rest/v1/picks?user_id=eq.${user.id}&select=*,team:teams(key),game:games(*)&order=week.asc`)

    const picksByWeek = {}
    picks.forEach(p => {
      picksByWeek[p.week] = p
    })

    const row = {
      player: displayName,
      week1: null,
      week2: null,
      week3: null,
      week4: null,
      totalLost: 0,
      expectedLives: 2,
      actualLives: member.lives_remaining,
      eliminated: member.is_eliminated
    }

    // Process each week
    for (let week = 1; week <= 4; week++) {
      const pick = picksByWeek[week]

      if (!pick) {
        // No pick made = incorrect
        row[`week${week}`] = { team: 'NO PICK', result: '❌', isCorrect: false }
        row.totalLost++
      } else {
        const game = pick.game
        if (game.is_final) {
          const homeWon = game.home_score > game.away_score
          const awayWon = game.away_score > game.home_score
          const pickedHome = game.home_team_id === pick.team_id
          const shouldBeCorrect = (pickedHome && homeWon) || (!pickedHome && awayWon)

          row[`week${week}`] = {
            team: pick.team.key,
            result: shouldBeCorrect ? '✅' : '❌',
            isCorrect: shouldBeCorrect
          }

          if (!shouldBeCorrect) {
            row.totalLost++
          }
        } else {
          row[`week${week}`] = { team: pick.team.key, result: '⏳', isCorrect: null }
        }
      }
    }

    row.expectedLives = Math.max(0, 2 - row.totalLost)
    tableData.push(row)
  }

  // Print header
  console.log()
  console.log(
    padRight('Player', 20) +
    ' | ' + padRight('Week 1', 12) +
    ' | ' + padRight('Week 2', 12) +
    ' | ' + padRight('Week 3', 12) +
    ' | ' + padRight('Week 4', 12) +
    ' | ' + padLeft('Lost', 5) +
    ' | ' + padLeft('Expected', 9) +
    ' | ' + padLeft('Actual', 7) +
    ' | ' + padLeft('Status', 10)
  )
  console.log('='.repeat(140))

  // Print rows
  for (const row of tableData) {
    const w1 = row.week1 ? `${row.week1.result} ${padRight(row.week1.team, 8)}` : padRight('NO PICK', 12)
    const w2 = row.week2 ? `${row.week2.result} ${padRight(row.week2.team, 8)}` : padRight('NO PICK', 12)
    const w3 = row.week3 ? `${row.week3.result} ${padRight(row.week3.team, 8)}` : padRight('NO PICK', 12)
    const w4 = row.week4 ? `${row.week4.result} ${padRight(row.week4.team, 8)}` : padRight('NO PICK', 12)

    const mismatch = row.expectedLives !== row.actualLives ? '⚠️ ' : '  '
    const status = row.eliminated ? 'ELIMINATED' : 'ALIVE'

    console.log(
      padRight(row.player, 20) +
      ' | ' + w1 +
      ' | ' + w2 +
      ' | ' + w3 +
      ' | ' + w4 +
      ' | ' + padLeft(row.totalLost.toString(), 5) +
      ' | ' + padLeft(row.expectedLives.toString(), 9) +
      ' | ' + padLeft(row.actualLives.toString(), 7) +
      ' | ' + mismatch + padRight(status, 8)
    )
  }

  console.log('='.repeat(140))

  // Summary
  const mismatches = tableData.filter(r => r.expectedLives !== r.actualLives)
  console.log(`\n✅ Correct: ${tableData.length - mismatches.length}`)
  console.log(`⚠️  Mismatches: ${mismatches.length}`)

  if (mismatches.length > 0) {
    console.log('\n📋 Players needing correction:')
    for (const row of mismatches) {
      console.log(`   ${row.player}: Expected ${row.expectedLives} lives, has ${row.actualLives}`)
    }
  }

  console.log('\n' + '='.repeat(140) + '\n')
}

main().catch(console.error)
