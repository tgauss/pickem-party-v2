import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Helper function to check if user is admin or commissioner
async function isUserAuthorized(userId: string, leagueId: string): Promise<boolean> {
  // Check if user is super admin
  const { data: user } = await supabase
    .from('users')
    .select('username')
    .eq('id', userId)
    .single()
  
  if (user?.username === 'pickemking') {
    return true
  }
  
  // Check if user is commissioner of this league
  const { data: league } = await supabase
    .from('leagues')
    .select('commissioner_id')
    .eq('id', leagueId)
    .single()
  
  return league?.commissioner_id === userId
}

// Helper function to create a notification
async function createNotification(
  leagueId: string,
  userId: string,
  type: string,
  title: string,
  message: string,
  metadata: Record<string, unknown> | null = null
) {
  await supabase
    .from('league_notifications')
    .insert({
      league_id: leagueId,
      user_id: userId,
      notification_type: type,
      title,
      message,
      metadata,
      is_public: true
    })
}

export async function POST(request: Request) {
  try {
    const { 
      leagueId,
      targetUserId,
      adjustmentAmount,
      reason,
      notes,
      adjustedBy
    } = await request.json()

    // Validate required fields
    if (!leagueId || !targetUserId || adjustmentAmount === undefined || !reason || !adjustedBy) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      })
    }

    // Check authorization
    const isAuthorized = await isUserAuthorized(adjustedBy, leagueId)
    if (!isAuthorized) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized: Only commissioners can adjust lives' 
      })
    }

    // Get current member data
    const { data: memberData, error: memberError } = await supabase
      .from('league_members')
      .select(`
        lives_remaining,
        user_id,
        users!inner(username, display_name)
      `)
      .eq('league_id', leagueId)
      .eq('user_id', targetUserId)
      .single()

    if (memberError || !memberData) {
      return NextResponse.json({ 
        success: false, 
        error: 'Member not found in league' 
      })
    }

    const livesBefore = memberData.lives_remaining
    const livesAfter = Math.max(0, Math.min(10, livesBefore + adjustmentAmount))

    // Prevent adjustment if it would result in no change
    if (livesAfter === livesBefore) {
      return NextResponse.json({ 
        success: false, 
        error: `Lives already at ${livesBefore} (within 0-10 range)` 
      })
    }

    const actualAdjustment = livesAfter - livesBefore

    // Update lives in league_members table
    const { error: updateError } = await supabase
      .from('league_members')
      .update({ lives_remaining: livesAfter })
      .eq('league_id', leagueId)
      .eq('user_id', targetUserId)

    if (updateError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update lives: ' + updateError.message 
      })
    }

    // Log the adjustment
    const { error: logError } = await supabase
      .from('league_life_adjustments')
      .insert({
        league_id: leagueId,
        user_id: targetUserId,
        adjusted_by: adjustedBy,
        lives_before: livesBefore,
        lives_after: livesAfter,
        adjustment_amount: actualAdjustment,
        reason,
        notes: notes || null,
        adjustment_type: actualAdjustment > 0 ? 
          (livesBefore === 0 ? 'resurrection' : 'manual') : 
          'manual'
      })

    if (logError) {
      console.error('Failed to log adjustment:', logError)
    }

    // Create notification
    const adjustmentType = actualAdjustment > 0 ? 'added' : 'removed'
    const livesWord = Math.abs(actualAdjustment) === 1 ? 'life' : 'lives'
    const userData = Array.isArray(memberData.users) ? memberData.users[0] : memberData.users as { username: string; display_name: string }
    const displayName = userData?.display_name || userData?.username || 'Player'
    
    const title = `${displayName} - Lives ${adjustmentType.charAt(0).toUpperCase() + adjustmentType.slice(1)}`
    const message = `${Math.abs(actualAdjustment)} ${livesWord} ${adjustmentType}. Reason: ${reason}. Lives: ${livesBefore} → ${livesAfter}`

    await createNotification(
      leagueId,
      targetUserId,
      'life_adjustment',
      title,
      message,
      {
        lives_before: livesBefore,
        lives_after: livesAfter,
        adjustment_amount: actualAdjustment,
        reason,
        notes,
        adjusted_by: adjustedBy
      }
    )

    // If this was a resurrection (0 → positive), create additional resurrection notification
    if (livesBefore === 0 && livesAfter > 0) {
      await createNotification(
        leagueId,
        targetUserId,
        'resurrection',
        `${displayName} - Resurrected!`,
        `${displayName} has been brought back to life with ${livesAfter} ${livesAfter === 1 ? 'life' : 'lives'}!`,
        {
          lives_granted: livesAfter,
          reason,
          notes
        }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: `Successfully ${adjustmentType} ${Math.abs(actualAdjustment)} ${livesWord}`,
      data: {
        lives_before: livesBefore,
        lives_after: livesAfter,
        adjustment_amount: actualAdjustment,
        was_resurrection: livesBefore === 0 && livesAfter > 0
      }
    })

  } catch (error) {
    console.error('Lives adjustment error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error adjusting lives' 
    })
  }
}