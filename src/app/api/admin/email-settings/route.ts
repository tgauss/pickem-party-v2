import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Super admin check
function isSuperAdmin(username: string): boolean {
  const superAdminUsernames = ['admin', 'tgauss', 'pickemking']
  return superAdminUsernames.includes(username.toLowerCase())
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const leagueId = searchParams.get('leagueId')
    const adminUsername = searchParams.get('adminUsername')

    if (!leagueId || !adminUsername) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 })
    }

    const supabase = createClient()

    // Get admin user and verify permissions
    const { data: adminUser } = await supabase
      .from('users')
      .select('id, username, display_name')
      .eq('username', adminUsername)
      .single()

    if (!adminUser) {
      return NextResponse.json({
        success: false,
        error: 'Admin user not found'
      }, { status: 403 })
    }

    // Get league and verify admin permissions
    const { data: league } = await supabase
      .from('leagues')
      .select('*')
      .eq('id', leagueId)
      .single()

    if (!league) {
      return NextResponse.json({
        success: false,
        error: 'League not found'
      }, { status: 404 })
    }

    const isCommissioner = league.commissioner_id === adminUser.id
    const isAdmin = isSuperAdmin(adminUser.username)

    if (!isCommissioner && !isAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    // Get email settings for league
    const { data: settings, error } = await supabase
      .from('league_email_settings')
      .select('*')
      .eq('league_id', leagueId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching email settings:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch email settings'
      }, { status: 500 })
    }

    // If no settings exist, return defaults
    if (!settings) {
      return NextResponse.json({
        success: true,
        settings: {
          league_id: leagueId,
          pick_reminder_enabled: true,
          pick_reminder_hours_before: 24,
          weekly_recap_enabled: true,
          weekly_recap_day: 2, // Tuesday
          weekly_recap_time: '10:00:00',
          payment_reminder_enabled: true,
          elimination_notice_enabled: true,
          custom_footer_text: null
        }
      })
    }

    return NextResponse.json({
      success: true,
      settings
    })

  } catch (error) {
    console.error('Email settings fetch error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch email settings'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      leagueId,
      pickReminderEnabled,
      pickReminderHoursBefore,
      weeklyRecapEnabled,
      weeklyRecapDay,
      weeklyRecapTime,
      paymentReminderEnabled,
      eliminationNoticeEnabled,
      customFooterText,
      adminUsername
    } = body

    const supabase = createClient()

    // Get admin user and verify permissions
    const { data: adminUser } = await supabase
      .from('users')
      .select('id, username, display_name')
      .eq('username', adminUsername)
      .single()

    if (!adminUser) {
      return NextResponse.json({
        success: false,
        error: 'Admin user not found'
      }, { status: 403 })
    }

    // Get league and verify admin permissions
    const { data: league } = await supabase
      .from('leagues')
      .select('*')
      .eq('id', leagueId)
      .single()

    if (!league) {
      return NextResponse.json({
        success: false,
        error: 'League not found'
      }, { status: 404 })
    }

    const isCommissioner = league.commissioner_id === adminUser.id
    const isAdmin = isSuperAdmin(adminUser.username)

    if (!isCommissioner && !isAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    // Upsert email settings
    const { data: settings, error } = await supabase
      .from('league_email_settings')
      .upsert({
        league_id: leagueId,
        pick_reminder_enabled: pickReminderEnabled,
        pick_reminder_hours_before: pickReminderHoursBefore,
        weekly_recap_enabled: weeklyRecapEnabled,
        weekly_recap_day: weeklyRecapDay,
        weekly_recap_time: weeklyRecapTime,
        payment_reminder_enabled: paymentReminderEnabled,
        elimination_notice_enabled: eliminationNoticeEnabled,
        custom_footer_text: customFooterText,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating email settings:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to update email settings'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      settings
    })

  } catch (error) {
    console.error('Email settings update error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update email settings'
    }, { status: 500 })
  }
}