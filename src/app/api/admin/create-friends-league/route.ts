import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST() {
  try {
    // Step 1: Get first user as commissioner
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .limit(1)
    
    if (!users?.[0]) {
      return NextResponse.json({ success: false, error: 'No users found' })
    }

    // Step 2: Create league with unique slug
    const timestamp = Date.now()
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .insert({
        name: 'Friends Test - Week 1 Ready',
        slug: `friends-test-${timestamp}`, 
        season_year: 2025,
        buy_in_amount: 0,
        is_public: true,
        invite_code: `FRD${timestamp.toString().slice(-4)}`,
        max_participants: 50,
        commissioner_id: users[0].id
      })
      .select()
      .single()
      
    console.log('League creation result:', { league, error: leagueError })

    if (!league || leagueError) {
      return NextResponse.json({ success: false, error: `Failed to create league: ${leagueError?.message || 'Unknown error'}` })
    }

    // Step 3: Get all users
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, username, display_name')

    if (!allUsers) {
      return NextResponse.json({ success: false, error: 'No users to add' })
    }

    // Step 4: Add all users to league
    const memberships = allUsers.map(user => ({
      league_id: league.id,
      user_id: user.id,
      lives_remaining: 2,
      is_paid: true,
      is_eliminated: false
    }))

    await supabase
      .from('league_members')
      .insert(memberships)

    return NextResponse.json({
      success: true,
      league: {
        id: league.id,
        name: league.name,
        slug: league.slug
      },
      members: allUsers.length,
      url: `/league/${league.slug}`
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, error: String(error) })
  }
}