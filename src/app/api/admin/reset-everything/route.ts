import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST() {
  try {
    console.log('Starting complete reset...')
    
    // Step 1: Delete all picks
    const { error: picksError } = await supabase
      .from('picks')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
    
    if (picksError) {
      console.error('Error deleting picks:', picksError)
      return NextResponse.json({ success: false, error: 'Failed to delete picks' })
    }
    console.log('✅ All picks deleted')
    
    // Step 2: Delete all league members
    const { error: membersError } = await supabase
      .from('league_members')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
    
    if (membersError) {
      console.error('Error deleting league members:', membersError)
      return NextResponse.json({ success: false, error: 'Failed to delete league members' })
    }
    console.log('✅ All league members deleted')
    
    // Step 3: Delete all leagues
    const { error: leaguesError } = await supabase
      .from('leagues')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
    
    if (leaguesError) {
      console.error('Error deleting leagues:', leaguesError)
      return NextResponse.json({ success: false, error: 'Failed to delete leagues' })
    }
    console.log('✅ All leagues deleted')
    
    // Step 4: Get all current users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, display_name')
    
    if (usersError || !users || users.length === 0) {
      return NextResponse.json({ success: false, error: 'No users found' })
    }
    console.log(`Found ${users.length} users to add to new league`)
    
    // Step 5: Create the single test league
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .insert({
        name: 'Season test simulation 1',
        slug: 'season-test-simulation-1',
        season_year: 2025,
        buy_in_amount: 0,
        is_public: true,
        invite_code: 'TEST001',
        max_participants: 50,
        commissioner_id: users[0].id // First user as commissioner
      })
      .select()
      .single()
    
    if (leagueError || !league) {
      console.error('Error creating league:', leagueError)
      return NextResponse.json({ success: false, error: 'Failed to create league' })
    }
    console.log('✅ Created league:', league.name)
    
    // Step 6: Add all users to the league
    const leagueMembers = users.map(user => ({
      league_id: league.id,
      user_id: user.id,
      lives_remaining: 2,
      is_paid: true,
      is_eliminated: false,
      eliminated_week: null
    }))
    
    const { error: addMembersError } = await supabase
      .from('league_members')
      .insert(leagueMembers)
    
    if (addMembersError) {
      console.error('Error adding members:', addMembersError)
      return NextResponse.json({ success: false, error: 'Failed to add members' })
    }
    console.log(`✅ Added ${users.length} members to league`)
    
    // Step 7: Verify the clean state
    const { count: picksCount } = await supabase
      .from('picks')
      .select('*', { count: 'exact', head: true })
    
    const { count: leaguesCount } = await supabase
      .from('leagues')
      .select('*', { count: 'exact', head: true })
    
    return NextResponse.json({
      success: true,
      message: 'Complete reset successful',
      league: {
        id: league.id,
        name: league.name,
        slug: league.slug,
        invite_code: league.invite_code,
        url: `/league/${league.slug}`
      },
      stats: {
        users: users.length,
        leagues: leaguesCount,
        picks: picksCount,
        members: users.map(u => ({
          username: u.username,
          displayName: u.display_name
        }))
      }
    })
  } catch (error) {
    console.error('Reset everything error:', error)
    return NextResponse.json({ success: false, error: 'Reset failed' })
  }
}