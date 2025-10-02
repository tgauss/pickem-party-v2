#!/usr/bin/env node
/**
 * Fix incorrect eliminations for Hayden and Taylor
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
        'Prefer': 'return=representation'
      }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(data ? JSON.parse(data) : null))
    })
    req.on('error', reject)
    if (options.body) req.write(JSON.stringify(options.body))
    req.end()
  })
}

async function main() {
  console.log('\n🔧 Fixing Incorrect Eliminations\n')
  console.log('='.repeat(60))

  // Get Hayden and Taylor
  const users = await supabaseRequest('/rest/v1/users?or=(display_name.eq.Hayden Gaussoin,display_name.eq.Taylor Gaussoin)&select=id,display_name')

  for (const user of users) {
    console.log(`\n👤 ${user.display_name}`)

    // Update their league member status
    await supabaseRequest(`/rest/v1/league_members?user_id=eq.${user.id}`, {
      method: 'PATCH',
      body: {
        lives_remaining: 1,
        is_eliminated: false,
        eliminated_week: null
      }
    })

    console.log('   ✅ Updated to: 1 life, NOT eliminated')
  }

  console.log('\n' + '='.repeat(60))
  console.log('\n✅ Corrections applied!\n')
}

main().catch(console.error)
