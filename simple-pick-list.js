#!/usr/bin/env node
/**
 * Simple list of all players and their picks per week
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
  console.log('==========================================')
  console.log('    ALL PLAYERS AND THEIR PICKS')
  console.log('==========================================')
  console.log()

  const members = await supabaseRequest('/rest/v1/league_members?select=*,user:users(id,username,display_name)&order=user(display_name).asc')

  for (const member of members) {
    const user = member.user
    const displayName = user.display_name || user.username

    console.log(`${displayName}`)

    // Get all picks for this user
    const picks = await supabaseRequest(`/rest/v1/picks?user_id=eq.${user.id}&select=week,team:teams(key)&order=week.asc`)

    const picksByWeek = {}
    picks.forEach(p => {
      picksByWeek[p.week] = p.team.key
    })

    // Show each week
    for (let week = 1; week <= 4; week++) {
      if (picksByWeek[week]) {
        console.log(`  Week ${week}: ${picksByWeek[week]}`)
      } else {
        console.log(`  Week ${week}: NO PICK`)
      }
    }

    console.log()
  }

  console.log('==========================================')
}

main().catch(console.error)
