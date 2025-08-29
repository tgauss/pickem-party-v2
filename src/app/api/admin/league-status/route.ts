import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    const { leagueId } = await request.json()
    
    // Get league members with their status
    const { data: members } = await supabase
      .from('league_members')
      .select(`
        lives_remaining,
        is_eliminated,
        eliminated_week,
        users!inner(username, display_name)
      `)
      .eq('league_id', leagueId)
      .order('lives_remaining', { ascending: false })
    
    // Get pick counts per member
    const { data: pickCounts } = await supabase
      .from('picks')
      .select(`
        user_id,
        week,
        is_correct,
        users!inner(username)
      `)
      .eq('league_id', leagueId)
    
    const picksByUser = new Map()
    pickCounts?.forEach((pick: any) => {
      const username = pick.users.username
      if (!picksByUser.has(username)) {
        picksByUser.set(username, { total: 0, correct: 0, incorrect: 0, weeks: new Set() })
      }
      const userPicks = picksByUser.get(username)
      userPicks.total++
      userPicks.weeks.add(pick.week)
      if (pick.is_correct === true) userPicks.correct++
      if (pick.is_correct === false) userPicks.incorrect++
    })
    
    const standings = members?.map((member: any) => ({
      username: member.users.username,
      displayName: member.users.display_name,
      lives: member.lives_remaining,
      eliminated: member.is_eliminated,
      eliminatedWeek: member.eliminated_week,
      picks: picksByUser.get(member.users.username) || { total: 0, correct: 0, incorrect: 0, weeks: new Set() },
      status: member.lives_remaining === 2 ? '❤️❤️' : 
              member.lives_remaining === 1 ? '❤️' : '💀'
    }))
    
    return NextResponse.json({
      success: true,
      standings,
      summary: {
        totalPlayers: members?.length || 0,
        alive: members?.filter(m => !m.is_eliminated).length || 0,
        eliminated: members?.filter(m => m.is_eliminated).length || 0
      }
    })
  } catch (error) {
    console.error('League status error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get league status' })
  }
}