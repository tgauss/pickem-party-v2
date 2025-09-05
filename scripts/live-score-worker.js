#!/usr/bin/env node

/**
 * Live Score Worker
 * 
 * This script runs every 5 minutes during NFL game days to fetch live scores
 * from ESPN and update the database. It should be scheduled via cron:
 * 
 * # Run every 5 minutes on Sundays, Thursdays, and Mondays during NFL season
 * # 0/5 * * * 0,1,4 node /path/to/scripts/live-score-worker.js
 * 
 * Environment variables required:
 * - LIVE_SCORE_API_URL: Base URL for the API (e.g., https://yourapp.com)
 * 
 * Usage:
 * node scripts/live-score-worker.js [--force] [--url=http://localhost:3000]
 */

const https = require('https')
const http = require('http')

// Parse command line arguments
const args = process.argv.slice(2)
const forceSync = args.includes('--force')
const urlArg = args.find(arg => arg.startsWith('--url='))
const baseUrl = urlArg ? urlArg.split('=')[1] : (process.env.LIVE_SCORE_API_URL || 'http://localhost:3000')

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`)
}

function isGameDay() {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  
  // NFL games typically on Sunday (0), Monday (1), Thursday (4)
  return [0, 1, 4].includes(dayOfWeek)
}

function isGameTime() {
  const now = new Date()
  const hour = now.getHours()
  
  // NFL games typically between 10 AM and 11 PM PT
  // This is a rough approximation - could be refined based on actual schedule
  return hour >= 10 && hour <= 23
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    
    const req = protocol.request(url, { method: 'POST' }, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data)
          resolve({ status: res.statusCode, data: response })
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`))
        }
      })
    })
    
    req.on('error', (error) => {
      reject(error)
    })
    
    req.setTimeout(30000, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
    
    req.end()
  })
}

async function syncLiveScores() {
  try {
    // Skip if it's not a game day/time unless forced
    if (!forceSync && (!isGameDay() || !isGameTime())) {
      log('Skipping - not game day/time (use --force to override)')
      return
    }
    
    log(`Starting live score sync${forceSync ? ' (forced)' : ''}...`)
    
    const syncUrl = `${baseUrl}/api/admin/sync-live-scores${forceSync ? '?force=true' : ''}`
    const response = await makeRequest(syncUrl)
    
    if (response.status === 200 && response.data.success) {
      const { updatedGames, liveGames, completedGames, totalProcessed } = response.data
      log(`✅ Success: ${updatedGames} games updated, ${liveGames} live, ${completedGames} completed (${totalProcessed} total)`)
    } else {
      log(`❌ Error: ${response.data.error || 'Unknown error'}`)
      process.exit(1)
    }
    
  } catch (error) {
    log(`❌ Failed to sync scores: ${error.message}`)
    process.exit(1)
  }
}

// Main execution
log('Live Score Worker starting...')
log(`Base URL: ${baseUrl}`)
log(`Force sync: ${forceSync}`)
log(`Game day check: ${isGameDay()}`)
log(`Game time check: ${isGameTime()}`)

syncLiveScores()
  .then(() => {
    log('Live Score Worker completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    log(`Live Score Worker failed: ${error.message}`)
    process.exit(1)
  })