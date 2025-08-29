import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST() {
  try {
    const testUsers = [
      {
        username: 'jaren',
        display_name: 'Jaren Petrusich',
        email: 'jlpetrusich@gmail.com',
        pin_hash: '1234'
      },
      {
        username: 'jordan',
        display_name: 'Jordan Petrusich', 
        email: 'jjpetrusich@gmail.com',
        pin_hash: '1234'
      },
      {
        username: 'brandon',
        display_name: 'Brandon O\'Dore',
        email: 'brandonodore@gmail.com',
        pin_hash: '1234'
      },
      {
        username: 'hayden',
        display_name: 'Hayden Gaussoin',
        email: 'haydeng4@gmail.com', 
        pin_hash: '1234'
      },
      {
        username: 'dan',
        display_name: 'Dan Evans',
        email: 'danevanspersonal@gmail.com',
        pin_hash: '1234'
      }
    ]

    let createdCount = 0
    let existingCount = 0

    for (const user of testUsers) {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', user.username)
        .single()

      if (existingUser) {
        existingCount++
        continue
      }

      // Create new user
      const { error } = await supabase
        .from('users')
        .insert(user)

      if (!error) {
        createdCount++
      } else {
        console.error(`Failed to create user ${user.username}:`, error)
      }
    }

    return NextResponse.json({ 
      success: true, 
      created: createdCount,
      existing: existingCount,
      total: testUsers.length
    })
  } catch (error) {
    console.error('Create test users error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create test users' })
  }
}