import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Helper function to check if user is super admin (hardcoded system)
function isSuperAdmin(username: string): boolean {
  const superAdminUsernames = ['admin', 'tgauss', 'pickemking']
  return superAdminUsernames.includes(username.toLowerCase())
}

export async function POST(request: Request) {
  try {
    const { leagueId, newCommissionerId, assignedBy } = await request.json()

    if (!leagueId || !newCommissionerId || !assignedBy) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      })
    }

    // Get the assigning user to check if they're super admin
    const { data: assigningUser, error: userError } = await supabase
      .from('users')
      .select('username')
      .eq('id', assignedBy)
      .single()

    if (userError || !assigningUser) {
      return NextResponse.json({ 
        success: false, 
        error: 'Assigning user not found' 
      })
    }

    // Check if assigning user is super admin
    if (!isSuperAdmin(assigningUser.username)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized: Only super admins can assign commissioners' 
      })
    }

    // Get league and new commissioner info
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('name, commissioner_id')
      .eq('id', leagueId)
      .single()

    const { data: newCommissioner, error: commissionerError } = await supabase
      .from('users')
      .select('username, display_name')
      .eq('id', newCommissionerId)
      .single()

    if (leagueError || !league || commissionerError || !newCommissioner) {
      return NextResponse.json({ 
        success: false, 
        error: 'League or new commissioner not found' 
      })
    }

    // Update the league commissioner
    const { error: updateError } = await supabase
      .from('leagues')
      .update({ commissioner_id: newCommissionerId })
      .eq('id', leagueId)

    if (updateError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update commissioner: ' + updateError.message 
      })
    }

    // Create activity notification
    await supabase
      .from('league_notifications')
      .insert({
        league_id: leagueId,
        user_id: newCommissionerId,
        notification_type: 'league_update',
        title: `New Commissioner Assigned - ${newCommissioner.display_name}`,
        message: `${newCommissioner.display_name} (@${newCommissioner.username}) has been assigned as the new league commissioner.`,
        metadata: {
          old_commissioner_id: league.commissioner_id,
          new_commissioner_id: newCommissionerId,
          assigned_by: assignedBy
        },
        is_public: true
      })

    return NextResponse.json({ 
      success: true,
      message: `Successfully assigned ${newCommissioner.display_name} as commissioner`,
      data: {
        league_name: league.name,
        new_commissioner: {
          id: newCommissionerId,
          username: newCommissioner.username,
          display_name: newCommissioner.display_name
        }
      }
    })

  } catch (error) {
    console.error('Commissioner assignment error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error assigning commissioner' 
    })
  }
}