import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const leagueId = searchParams.get('leagueId')
    const type = searchParams.get('type') // 'public' or 'admin'
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!leagueId) {
      return NextResponse.json({ 
        success: false, 
        error: 'League ID is required' 
      })
    }

    let query = supabase
      .from('league_notifications')
      .select('*')
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Filter by public notifications only if not admin view
    if (type === 'public') {
      query = query.eq('is_public', true)
    }

    const { data: notifications, error } = await query

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch activity log: ' + error.message 
      })
    }

    return NextResponse.json({ 
      success: true,
      data: notifications || []
    })

  } catch (error) {
    console.error('Activity log fetch error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error fetching activity log' 
    })
  }
}

// Get detailed life adjustment history for admin view
export async function POST(request: Request) {
  try {
    const { leagueId, userId } = await request.json()

    if (!leagueId) {
      return NextResponse.json({ 
        success: false, 
        error: 'League ID is required' 
      })
    }

    let query = supabase
      .from('league_life_adjustments')
      .select(`
        *,
        user:users!league_life_adjustments_user_id_fkey(username, display_name),
        adjusted_by_user:users!league_life_adjustments_adjusted_by_fkey(username, display_name)
      `)
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false })

    // Filter by specific user if provided
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: adjustments, error } = await query

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch life adjustments: ' + error.message 
      })
    }

    return NextResponse.json({ 
      success: true,
      data: adjustments || []
    })

  } catch (error) {
    console.error('Life adjustments fetch error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error fetching life adjustments' 
    })
  }
}