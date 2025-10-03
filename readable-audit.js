#!/usr/bin/env node
/**
 * Generate readable audit - checking for ties as losses
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
  console.log('\n')
  console.log('================================================================================')
  console.log('                    COMPLETE PICK AUDIT - ALL PLAYERS')
  console.log('                    (Ties count as LOSSES)')
  console.log('================================================================================')
  console.log()

  const members = await supabaseRequest('/rest/v1/league_members?select=*,user:users(id,username,display_name)&order=user(display_name).asc')

  for (const member of members) {
    const user = member.user
    const displayName = user.display_name || user.username

    console.log('--------------------------------------------------------------------------------')
    console.log(`PLAYER: ${displayName}`)
    console.log('--------------------------------------------------------------------------------')

    // Get all picks for this user
    const picks = await supabaseRequest(`/rest/v1/picks?user_id=eq.${user.id}&select=*,team:teams(key,full_name),game:games(*,home_team:teams!games_home_team_id_fkey(key,full_name),away_team:teams!games_away_team_id_fkey(key,full_name))&order=week.asc`)

    const picksByWeek = {}
    picks.forEach(p => {
      picksByWeek[p.week] = p
    })

    let totalLivesLost = 0

    // Check each week 1-4
    for (let week = 1; week <= 4; week++) {
      const pick = picksByWeek[week]

      if (!pick) {
        console.log(`  Week ${week}: NO PICK MADE`)
        console.log(`           Result: LOSS (no pick = automatic loss)`)
        console.log()
        totalLivesLost++
      } else {
        const game = pick.game
        const team = pick.team

        console.log(`  Week ${week}: Picked ${team.key} (${team.full_name})`)

        if (!game.is_final) {
          console.log(`           Game: ${game.away_team.key} @ ${game.home_team.key} - NOT FINAL YET`)
          console.log()
        } else {
          const homeScore = game.home_score
          const awayScore = game.away_score
          const pickedHome = game.home_team_id === pick.team_id

          console.log(`           Game: ${game.away_team.key} ${awayScore} @ ${game.home_team.key} ${homeScore}`)

          // Check for tie
          if (homeScore === awayScore) {
            console.log(`           Result: TIE - Counts as LOSS`)
            totalLivesLost++
          } else {
            const homeWon = homeScore > awayScore
            const awayWon = awayScore > homeScore
            const isCorrect = (pickedHome && homeWon) || (!pickedHome && awayWon)

            if (isCorrect) {
              console.log(`           Result: WIN - Correct pick`)
            } else {
              console.log(`           Result: LOSS - Wrong pick`)
              totalLivesLost++
            }
          }
          console.log()
        }
      }
    }

    const expectedLives = Math.max(0, 2 - totalLivesLost)
    const actualLives = member.lives_remaining
    const shouldBeEliminated = expectedLives === 0

    console.log('  SUMMARY:')
    console.log(`    Starting Lives: 2`)
    console.log(`    Total Lives Lost: ${totalLivesLost}`)
    console.log(`    Expected Lives: ${expectedLives}`)
    console.log(`    Actual Lives in DB: ${actualLives}`)
    console.log(`    Should Be Eliminated: ${shouldBeEliminated ? 'YES' : 'NO'}`)
    console.log(`    Actually Eliminated: ${member.is_eliminated ? 'YES' : 'NO'}`)

    if (expectedLives !== actualLives) {
      console.log(`    >>> MISMATCH! Needs correction <<<`)
    } else {
      console.log(`    >>> CORRECT <<<`)
    }

    console.log()
  }

  console.log('================================================================================')
  console.log()
}

main().catch(console.error)
