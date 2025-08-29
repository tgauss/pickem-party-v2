import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST() {
  try {
    // Get the first league
    const { data: leagues } = await supabase
      .from('leagues')
      .select('id, name')
      .limit(1)
    
    if (!leagues || leagues.length === 0) {
      return NextResponse.json({ success: false, error: 'No leagues found' })
    }
    
    const league = leagues[0]
    
    // Get our test users (those with pin_hash = '1234')
    const { data: testUsers } = await supabase
      .from('users')
      .select('id, username')
      .eq('pin_hash', '1234')
    
    if (!testUsers || testUsers.length === 0) {
      return NextResponse.json({ success: false, error: 'No test users found' })
    }
    
    let addedCount = 0
    
    for (const user of testUsers) {
      // Check if user is already in the league
      const { data: existingMember } = await supabase
        .from('league_members')
        .select('id')
        .eq('league_id', league.id)
        .eq('user_id', user.id)
        .single()
      
      if (existingMember) continue
      
      // Add user to league
      const { error } = await supabase
        .from('league_members')
        .insert({
          league_id: league.id,
          user_id: user.id,
          lives_remaining: 2,
          is_paid: true,
          is_eliminated: false
        })
      
      if (!error) addedCount++
    }
    
    return NextResponse.json({
      success: true,
      league: league.name,
      leagueId: league.id,
      addedUsers: addedCount,
      totalTestUsers: testUsers.length
    })
  } catch (error) {
    console.error('Add users to league error:', error)
    return NextResponse.json({ success: false, error: 'Failed to add users to league' })
  }
}