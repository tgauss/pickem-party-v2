#!/usr/bin/env node
/**
 * Fix all incorrect life counts
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
      res.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : null)
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

async function main() {
  console.log('\n' + '='.repeat(80))
  console.log('🔧 FIXING ALL INCORRECT LIFE COUNTS')
  console.log('='.repeat(80))
  console.log()

  const fixes = [
    {
      name: 'Bobbie Boucher',
      correctLives: 1,
      shouldBeEliminated: false,
      eliminatedWeek: null
    },
    {
      name: 'Dan Evans',
      correctLives: 1,
      shouldBeEliminated: false,
      eliminatedWeek: null
    },
    {
      name: 'Kyler Stroud',
      correctLives: 1,
      shouldBeEliminated: false,
      eliminatedWeek: null
    },
    {
      name: 'Matador',
      correctLives: 1,
      shouldBeEliminated: false,
      eliminatedWeek: null
    },
    {
      name: 'Osprey',
      correctLives: 1,
      shouldBeEliminated: false,
      eliminatedWeek: null
    },
    {
      name: 'Shneebly',
      correctLives: 0,
      shouldBeEliminated: true,
      eliminatedWeek: 4
    }
  ]

  for (const fix of fixes) {
    console.log(`Processing: ${fix.name}`)

    // Get user ID
    const users = await supabaseRequest(`/rest/v1/users?display_name=eq.${encodeURIComponent(fix.name)}&select=id,display_name`)

    if (!users || users.length === 0) {
      console.log(`   ❌ Could not find user`)
      continue
    }

    const userId = users[0].id

    // Update league member
    const result = await supabaseRequest(`/rest/v1/league_members?user_id=eq.${userId}`, {
      method: 'PATCH',
      body: {
        lives_remaining: fix.correctLives,
        is_eliminated: fix.shouldBeEliminated,
        eliminated_week: fix.eliminatedWeek
      }
    })

    console.log(`   ✅ Updated to: ${fix.correctLives} lives, ${fix.shouldBeEliminated ? 'ELIMINATED' : 'ACTIVE'}`)
    console.log()
  }

  console.log('='.repeat(80))
  console.log('✅ ALL FIXES APPLIED')
  console.log('='.repeat(80))
  console.log()
}

main().catch(err => {
  console.error('\n❌ Error:', err.message)
  process.exit(1)
})
