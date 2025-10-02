#!/usr/bin/env node
/**
 * Quick league status check
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
  const members = await supabaseRequest('/rest/v1/league_members?select=*,user:users(username,display_name)&order=lives_remaining.desc,user(display_name).asc')

  console.log('\n📊 LEAGUE STATUS AFTER WEEK 4\n')
  console.log('='.repeat(60))

  const alive = members.filter(m => !m.is_eliminated)
  const eliminated = members.filter(m => m.is_eliminated)

  console.log(`\n✅ ALIVE (${alive.length} players):\n`)
  const twoLives = alive.filter(m => m.lives_remaining === 2)
  const oneLife = alive.filter(m => m.lives_remaining === 1)

  if (twoLives.length > 0) {
    console.log(`   2 LIVES (${twoLives.length} players):`)
    twoLives.forEach(m => console.log(`      - ${m.user.display_name || m.user.username}`))
  }

  if (oneLife.length > 0) {
    console.log(`\n   1 LIFE (${oneLife.length} players):`)
    oneLife.forEach(m => console.log(`      - ${m.user.display_name || m.user.username}`))
  }

  console.log(`\n💀 ELIMINATED (${eliminated.length} players):\n`)
  eliminated.forEach(m => {
    console.log(`   - ${m.user.display_name || m.user.username} (Week ${m.eliminated_week || '?'})`)
  })

  console.log('\n' + '='.repeat(60) + '\n')
}

main().catch(console.error)
