import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId, adminUsername } = await request.json()

    // Validate required fields
    if (!userId || !adminUsername) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: userId, adminUsername' 
      })
    }

    // Verify admin authorization
    const superAdminUsernames = ['admin', 'tgauss', 'pickemking']
    if (!superAdminUsernames.includes(adminUsername.toLowerCase())) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized - Super admin access required' 
      })
    }

    // Get user details before deletion for audit trail
    const { data: userToDelete, error: fetchError } = await supabase
      .from('users')
      .select('username, display_name, email')
      .eq('id', userId)
      .single()

    if (fetchError || !userToDelete) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      })
    }

    // Prevent deletion of super admin users
    if (superAdminUsernames.includes(userToDelete.username.toLowerCase())) {
      return NextResponse.json({ 
        success: false, 
        error: 'Cannot delete super admin users' 
      })
    }

    // Start transaction-like deletions (in order to avoid foreign key constraints)
    const deletionSummary = {
      picks: 0,
      leagueMemberships: 0,
      notifications: 0,
      commissonerLeagues: 0,
      user: 0
    }

    // 1. Delete all user picks
    const { count: picksCount, error: picksError } = await supabase
      .from('picks')
      .delete({ count: 'exact' })
      .eq('user_id', userId)

    if (picksError) {
      console.error('Error deleting picks:', picksError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to delete user picks' 
      })
    }
    deletionSummary.picks = picksCount || 0

    // 2. Delete league memberships
    const { count: membershipsCount, error: membershipsError } = await supabase
      .from('league_members')
      .delete({ count: 'exact' })
      .eq('user_id', userId)

    if (membershipsError) {
      console.error('Error deleting league memberships:', membershipsError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to delete league memberships' 
      })
    }
    deletionSummary.leagueMemberships = membershipsCount || 0

    // 3. Delete notifications for this user
    const { count: notificationsCount, error: notificationsError } = await supabase
      .from('league_notifications')
      .delete({ count: 'exact' })
      .eq('user_id', userId)

    if (notificationsError) {
      console.error('Error deleting notifications:', notificationsError)
      // Don't fail for notifications, just log
    }
    deletionSummary.notifications = notificationsCount || 0

    // 4. Update leagues where this user is commissioner (set to null)
    const { count: commissionerLeaguesCount, error: commissionerError } = await supabase
      .from('leagues')
      .update({ commissioner_id: null })
      .eq('commissioner_id', userId)

    if (commissionerError) {
      console.error('Error updating commissioner leagues:', commissionerError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update commissioner leagues' 
      })
    }
    deletionSummary.commissonerLeagues = commissionerLeaguesCount || 0

    // 5. Finally, delete the user
    const { count: userCount, error: userError } = await supabase
      .from('users')
      .delete({ count: 'exact' })
      .eq('id', userId)

    if (userError) {
      console.error('Error deleting user:', userError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to delete user account' 
      })
    }
    deletionSummary.user = userCount || 0

    // Create audit trail in system logs (using league_notifications as a general audit table)
    const auditData = {
      league_id: null, // System-wide audit
      user_id: null, // User no longer exists
      notification_type: 'user_deletion',
      title: `User Account Deleted by Admin`,
      message: `${adminUsername} completely deleted user account: ${userToDelete.display_name} (@${userToDelete.username})`,
      metadata: {
        deleted_user: {
          id: userId,
          username: userToDelete.username,
          display_name: userToDelete.display_name,
          email: userToDelete.email
        },
        deletion_summary: deletionSummary,
        deleted_by: adminUsername,
        deleted_at: new Date().toISOString()
      }
    }

    const { error: auditError } = await supabase
      .from('league_notifications')
      .insert(auditData)

    if (auditError) {
      console.warn('Failed to create deletion audit trail:', auditError)
      // Don't fail the operation for audit issues
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted user ${userToDelete.display_name} (@${userToDelete.username})`,
      deletionSummary: {
        user: userToDelete.display_name,
        username: userToDelete.username,
        picksDeleted: deletionSummary.picks,
        leagueMembershipsDeleted: deletionSummary.leagueMemberships,
        notificationsDeleted: deletionSummary.notifications,
        commissionerLeaguesUpdated: deletionSummary.commissonerLeagues,
        deletedBy: adminUsername,
        deletedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('User deletion error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    })
  }
}