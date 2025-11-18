#!/usr/bin/env node

/**
 * Standalone cron settlement script
 *
 * Can be run directly via cron or scheduled task:
 *
 * # Monday at 10:00 PM PST (adjust timezone as needed)
 * 0 22 * * 1 cd /path/to/pickem-party && node cron-settlement.js
 *
 * Or use with a service like:
 * - Railway
 * - Render
 * - AWS Lambda
 * - Google Cloud Scheduler
 */

const APP_URL = process.env.APP_URL || 'https://www.pickemparty.app'
const CRON_SECRET = process.env.CRON_SECRET || 'pickem-party-cron-2025'

async function runSettlement() {
  console.log('[CRON] Starting weekly settlement...')
  console.log('[CRON] Time:', new Date().toISOString())

  try {
    const response = await fetch(`${APP_URL}/api/admin/auto-settle-week`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': CRON_SECRET
      },
      body: JSON.stringify({
        dryRun: process.argv.includes('--dry-run')
      })
    })

    const result = await response.json()

    console.log('[CRON] Settlement result:')
    console.log(JSON.stringify(result, null, 2))

    if (!result.success) {
      console.error('[CRON] Settlement failed!')
      process.exit(1)
    }

    console.log('[CRON] Settlement completed successfully!')
    console.log(`[CRON] Week ${result.week}: ${result.picksProcessed} picks, ${result.lifeDeductions} life deductions, ${result.eliminations.length} eliminations`)

    if (result.eliminations.length > 0) {
      console.log('[CRON] Eliminated players:', result.eliminations.join(', '))
    }

    process.exit(0)
  } catch (error) {
    console.error('[CRON] Error:', error)
    process.exit(1)
  }
}

runSettlement()
