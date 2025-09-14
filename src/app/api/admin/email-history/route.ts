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
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

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

    // Get email history for league
    const { data: emailHistory, error } = await supabase
      .from('email_history')
      .select(`
        *,
        users:recipient_user_id(display_name, username)
      `)
      .eq('league_id', leagueId)
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching email history:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch email history'
      }, { status: 500 })
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('email_history')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)

    if (countError) {
      console.error('Error fetching email history count:', countError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch email history count'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      emailHistory,
      totalCount: count || 0,
      hasMore: (offset + limit) < (count || 0)
    })

  } catch (error) {
    console.error('Email history fetch error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch email history'
    }, { status: 500 })
  }
}