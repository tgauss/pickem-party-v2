import { NextResponse } from 'next/server'

// Simple webhook for Make.com (formerly Integromat)
// This sends pick data to your Make.com webhook which handles Google Sheets
export async function POST(req: Request) {
  try {
    const data = await req.json()
    
    // Get Make.com webhook URL from environment variable
    const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL
    
    // Format the data for Make.com (simple flat structure)
    const webhookData = {
      timestamp: new Date().toISOString(),
      user_id: data.user_id,
      username: data.username,
      display_name: data.display_name,
      league_id: data.league_id,
      league_name: data.league_name,
      week: data.week,
      team_id: data.team_id,
      team_name: data.team_name,
      team_key: data.team_key,
      action: data.is_update ? 'UPDATE' : 'NEW',
      season: new Date().getFullYear()
    }
    
    // If webhook URL exists, send to Make.com
    if (MAKE_WEBHOOK_URL) {
      fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData)
      }).catch(err => {
        console.error('[Make.com Error]', err)
        // Don't block on errors
      })
    }
    
    // Always log locally as backup
    console.log('[PICK BACKUP]', JSON.stringify(webhookData))
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Webhook Error]', error)
    // Always return success so picks aren't blocked
    return NextResponse.json({ success: true })
  }
}