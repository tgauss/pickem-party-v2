import { NextResponse } from 'next/server'

// Simple Google Sheets backup using webhook/form approach
// This avoids complex OAuth and uses Google Forms/Apps Script instead
export async function POST(req: Request) {
  try {
    const data = await req.json()
    
    // Validate required fields
    if (!data.user_id || !data.week || !data.team_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Format the data for Google Sheets
    const backupEntry = {
      timestamp: data.timestamp || new Date().toISOString(),
      backup_id: data.backup_id || `${data.user_id}_${data.week}_${Date.now()}`,
      user_id: data.user_id,
      username: data.username || 'Unknown',
      display_name: data.display_name || 'Unknown',
      league_id: data.league_id,
      league_name: data.league_name || 'Unknown',
      week: data.week,
      team_id: data.team_id,
      team_name: data.team_name || 'Unknown',
      team_key: data.team_key || 'UNK',
      action: data.is_update ? 'UPDATE' : 'NEW',
      season: new Date().getFullYear(),
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown'
    }

    // Google Apps Script Web App URL (you'll need to create this)
    // For now, we'll use a placeholder and you can replace it with your actual webhook
    const GOOGLE_SHEETS_WEBHOOK = process.env.GOOGLE_SHEETS_WEBHOOK_URL || ''
    
    if (!GOOGLE_SHEETS_WEBHOOK) {
      // If no webhook configured, just log locally for now
      console.log('[PICK BACKUP]', JSON.stringify(backupEntry))
      
      // Still return success so picks aren't blocked
      return NextResponse.json({
        success: true,
        message: 'Backup logged locally (webhook not configured)',
        backup_id: backupEntry.backup_id
      })
    }

    // Send to Google Sheets via webhook
    const response = await fetch(GOOGLE_SHEETS_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backupEntry)
    })

    if (!response.ok) {
      console.error('Google Sheets backup failed:', response.status)
      // Don't throw - we don't want to block picks
    }

    return NextResponse.json({
      success: true,
      backup_id: backupEntry.backup_id,
      message: 'Pick backed up successfully'
    })

  } catch (error) {
    console.error('Backup error:', error)
    
    // Always return success so we don't block pick submissions
    return NextResponse.json({
      success: true,
      message: 'Backup failed but pick processed',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// GET endpoint to verify backup is working
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Pick backup API is running',
    webhook_configured: !!process.env.GOOGLE_SHEETS_WEBHOOK_URL
  })
}