import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    console.log('Starting create new test league...')
    const body = await request.json()
    const leagueName = body.leagueName || 'Test League - Week 1 Ready'
    console.log('League name:', leagueName)

    // Get the first user to be commissioner (fallback)
    const { data: users } = await supabase
      .from('users')
      .select('id, username, display_name')
      .limit(1)

    if (!users || users.length === 0) {
      return NextResponse.json({ success: false, error: 'No users found to create league' })
    }

    const commissioner = users[0]

    // Create new league
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .insert({
        name: leagueName,
        slug: leagueName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        season_year: 2025,
        buy_in_amount: 0,
        is_public: true,
        invite_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
        max_participants: 50,
        commissioner_id: commissioner.id
      })
      .select()
      .single()

    if (leagueError || !league) {
      return NextResponse.json({ success: false, error: 'Failed to create league: ' + leagueError?.message })
    }

    // Get ALL users in the platform
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, username, display_name')

    if (!allUsers) {
      return NextResponse.json({ success: false, error: 'No users found to add to league' })
    }

    // Add all users to the new league
    const leagueMembers = allUsers.map(user => ({
      league_id: league.id,
      user_id: user.id,
      lives_remaining: 2,
      is_paid: true, // Set to true for testing
      is_eliminated: false
    }))

    const { error: membersError } = await supabase
      .from('league_members')
      .insert(leagueMembers)

    if (membersError) {
      return NextResponse.json({ success: false, error: 'Failed to add members: ' + membersError.message })
    }

    return NextResponse.json({
      success: true,
      league: {
        id: league.id,
        name: league.name,
        slug: league.slug,
        invite_code: league.invite_code
      },
      members: allUsers.map(user => ({
        username: user.username,
        displayName: user.display_name
      })),
      totalMembers: allUsers.length,
      message: `Created league "${leagueName}" with ${allUsers.length} members ready for Week 1 testing!`
    })
  } catch (error) {
    console.error('Create new test league error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create test league' })
  }
}