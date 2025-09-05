import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST() {
  try {
    console.log('🗑️ Clearing 2024 season data...')
    
    // Delete all 2024 games
    const { error: deleteGamesError } = await supabase
      .from('games')
      .delete()
      .eq('season_year', 2024)
    
    if (deleteGamesError) {
      console.error('Error deleting 2024 games:', deleteGamesError)
    } else {
      console.log('✅ Deleted all 2024 games')
    }

    // Note: 2024 picks would have been deleted via cascade when games were deleted
    console.log('📝 2024 picks deleted via cascade relationship')

    // Get current 2025 games count
    const { data: games2025, error: countError } = await supabase
      .from('games')
      .select('id')
      .eq('season_year', 2025)
    
    if (countError) {
      console.error('Error counting 2025 games:', countError)
    }

    const gamesCount = games2025?.length || 0
    console.log(`📊 Current 2025 games in database: ${gamesCount}`)

    return NextResponse.json({
      success: true,
      message: `Reset to 2025 season complete`,
      deleted2024Games: true,
      current2025Games: gamesCount
    })
    
  } catch (error) {
    console.error('Reset to 2025 error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to reset to 2025 season'
    })
  }
}