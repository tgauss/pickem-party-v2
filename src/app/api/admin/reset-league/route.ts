import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    const { leagueId } = await request.json()
    
    // Delete all picks for this league
    const { error: picksError } = await supabase
      .from('picks')
      .delete()
      .eq('league_id', leagueId)
    
    if (picksError) {
      return NextResponse.json({ success: false, error: 'Failed to delete picks' })
    }
    
    // Reset all league members
    const { error: membersError } = await supabase
      .from('league_members')
      .update({
        lives_remaining: 2,
        is_eliminated: false,
        eliminated_week: null
      })
      .eq('league_id', leagueId)
    
    if (membersError) {
      return NextResponse.json({ success: false, error: 'Failed to reset members' })
    }
    
    // Get member count
    const { data: members } = await supabase
      .from('league_members')
      .select('id')
      .eq('league_id', leagueId)
    
    return NextResponse.json({
      success: true,
      message: `Reset league with ${members?.length || 0} members`,
      membersReset: members?.length || 0
    })
  } catch (error) {
    console.error('Reset league error:', error)
    return NextResponse.json({ success: false, error: 'Failed to reset league' })
  }
}