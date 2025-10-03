#!/usr/bin/env node
/**
 * Audit for Missing Picks - No pick = Loss of life
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
  console.log('🔍 MISSING PICKS AUDIT - Checking for weeks without picks')
  console.log('='.repeat(100))

  // Get all league members
  const members = await supabaseRequest('/rest/v1/league_members?select=*,user:users(id,username,display_name)&order=user(display_name).asc')

  console.log(`\nTotal Players: ${members.length}`)
  console.log('\nWeeks to check: 1, 2, 3, 4\n')

  const missingPicksReport = []

  for (const member of members) {
    const user = member.user
    const displayName = user.display_name || user.username

    // Get all picks for this user
    const picks = await supabaseRequest(`/rest/v1/picks?user_id=eq.${user.id}&select=week`)

    // Check which weeks they have picks for
    const weeksWithPicks = new Set(picks.map(p => p.week))
    const missingWeeks = []

    for (let week = 1; week <= 4; week++) {
      if (!weeksWithPicks.has(week)) {
        missingWeeks.push(week)
      }
    }

    if (missingWeeks.length > 0) {
      const livesLostToMissingPicks = missingWeeks.length
      const correctPicks = picks.length - picks.filter(p => p.is_correct === false).length

      missingPicksReport.push({
        user: displayName,
        missingWeeks,
        livesLostToMissingPicks,
        currentLives: member.lives_remaining,
        isEliminated: member.is_eliminated
      })

      console.log('─'.repeat(100))
      console.log(`👤 ${displayName}`)
      console.log(`   Missing picks for Week(s): ${missingWeeks.join(', ')}`)
      console.log(`   Lives lost due to missing picks: ${livesLostToMissingPicks}`)
      console.log(`   Current lives in DB: ${member.lives_remaining}`)
      console.log(`   Eliminated status: ${member.is_eliminated ? 'YES' : 'NO'}`)
    }
  }

  console.log('\n' + '='.repeat(100))
  console.log('📊 MISSING PICKS SUMMARY')
  console.log('='.repeat(100))

  if (missingPicksReport.length === 0) {
    console.log('\n✅ All players have made picks for all weeks 1-4')
  } else {
    console.log(`\n⚠️  Found ${missingPicksReport.length} player(s) with missing picks:\n`)

    for (const report of missingPicksReport) {
      const shouldHaveLives = Math.max(0, 2 - report.livesLostToMissingPicks)
      const livesMatch = shouldHaveLives === report.currentLives

      console.log(`   ${report.user}:`)
      console.log(`      Missing weeks: ${report.missingWeeks.join(', ')}`)
      console.log(`      Should have: ${shouldHaveLives} lives`)
      console.log(`      Actually has: ${report.currentLives} lives`)
      console.log(`      Status: ${livesMatch ? '✅ Correct' : '❌ NEEDS CORRECTION'}`)
      console.log()
    }
  }

  console.log('='.repeat(100) + '\n')
}

main().catch(console.error)
