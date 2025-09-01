import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Helper function to check if user is authorized (super admin or commissioner)
async function isUserAuthorized(userId: string, leagueId: string): Promise<boolean> {
  // Check if user is super admin
  const { data: user } = await supabase
    .from('users')
    .select('username')
    .eq('id', userId)
    .single()
  
  const superAdminUsernames = ['admin', 'tgauss', 'pickemking']
  if (user && superAdminUsernames.includes(user.username.toLowerCase())) {
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

export async function POST(request: Request) {
  try {
    const { leagueId, week, userId } = await request.json()

    if (!leagueId || !week || !userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      })
    }

    // Check authorization
    const isAuthorized = await isUserAuthorized(userId, leagueId)
    if (!isAuthorized) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized: Only commissioners and super admins can reveal picks' 
      })
    }

    // Get current revealed weeks
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('picks_revealed_weeks, name')
      .eq('id', leagueId)
      .single()

    if (leagueError || !league) {
      return NextResponse.json({ 
        success: false, 
        error: 'League not found' 
      })
    }

    const currentRevealedWeeks = league.picks_revealed_weeks || []
    
    // Check if week is already revealed
    if (currentRevealedWeeks.includes(week)) {
      return NextResponse.json({ 
        success: false, 
        error: `Week ${week} picks are already revealed` 
      })
    }

    // Add the week to revealed weeks
    const updatedRevealedWeeks = [...currentRevealedWeeks, week].sort((a, b) => a - b)

    // Update the league
    const { error: updateError } = await supabase
      .from('leagues')
      .update({ picks_revealed_weeks: updatedRevealedWeeks })
      .eq('id', leagueId)

    if (updateError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to reveal picks: ' + updateError.message 
      })
    }

    // Get user info for notification
    const { data: commissionerData } = await supabase
      .from('users')
      .select('username, display_name')
      .eq('id', userId)
      .single()

    // Create activity notification
    await supabase
      .from('league_notifications')
      .insert({
        league_id: leagueId,
        user_id: null, // Public notification
        notification_type: 'picks_revealed',
        title: `Week ${week} Picks Revealed`,
        message: `All picks for Week ${week} have been revealed by the commissioner. Check out who picked which teams!`,
        metadata: {
          week: week,
          revealed_by: userId,
          revealed_by_name: commissionerData?.display_name || commissionerData?.username || 'Commissioner'
        },
        is_public: true
      })

    return NextResponse.json({ 
      success: true,
      message: `Week ${week} picks have been revealed!`,
      data: {
        week: week,
        revealed_weeks: updatedRevealedWeeks,
        league_name: league.name
      }
    })

  } catch (error) {
    console.error('Reveal picks error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error revealing picks' 
    })
  }
}