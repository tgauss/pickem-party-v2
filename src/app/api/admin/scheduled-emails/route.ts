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

    // Get scheduled emails for league
    const { data: scheduledEmails, error } = await supabase
      .from('scheduled_emails')
      .select(`
        *,
        email_templates:template_id(name, template_type),
        users:created_by(display_name)
      `)
      .eq('league_id', leagueId)
      .order('scheduled_for', { ascending: false })

    if (error) {
      console.error('Error fetching scheduled emails:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch scheduled emails'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      scheduledEmails
    })

  } catch (error) {
    console.error('Scheduled emails fetch error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch scheduled emails'
    }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { emailId, adminUsername } = body

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

    // Get scheduled email and verify permissions
    const { data: scheduledEmail } = await supabase
      .from('scheduled_emails')
      .select(`
        *,
        leagues(commissioner_id)
      `)
      .eq('id', emailId)
      .single()

    if (!scheduledEmail) {
      return NextResponse.json({
        success: false,
        error: 'Scheduled email not found'
      }, { status: 404 })
    }

    const isCommissioner = scheduledEmail.leagues?.commissioner_id === adminUser.id
    const isAdmin = isSuperAdmin(adminUser.username)
    const isCreator = scheduledEmail.created_by === adminUser.id

    if (!isCommissioner && !isAdmin && !isCreator) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    // Check if email is already sent
    if (scheduledEmail.status === 'sent') {
      return NextResponse.json({
        success: false,
        error: 'Cannot cancel sent emails'
      }, { status: 400 })
    }

    // Update status to cancelled
    const { error } = await supabase
      .from('scheduled_emails')
      .update({
        status: 'cancelled',
        error_message: `Cancelled by ${adminUser.display_name}`
      })
      .eq('id', emailId)

    if (error) {
      console.error('Error cancelling scheduled email:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to cancel scheduled email'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Scheduled email cancelled successfully'
    })

  } catch (error) {
    console.error('Scheduled email cancellation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to cancel scheduled email'
    }, { status: 500 })
  }
}