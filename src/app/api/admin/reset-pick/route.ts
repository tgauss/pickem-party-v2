import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId, leagueId, week, adminUsername } = await request.json()

    // Validate required fields
    if (!userId || !leagueId || !week || !adminUsername) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: userId, leagueId, week, adminUsername' 
      })
    }

    // Verify admin authorization
    const superAdminUsernames = ['admin', 'tgauss', 'pickemking']
    if (!superAdminUsernames.includes(adminUsername.toLowerCase())) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized - Super admin access required' 
      })
    }

    // Get the existing pick to log what we're resetting
    const { data: existingPick, error: fetchError } = await supabase
      .from('picks')
      .select(`
        *,
        users(username, display_name),
        teams(key, city, name),
        games(game_time, home_team_id, away_team_id)
      `)
      .eq('user_id', userId)
      .eq('league_id', leagueId)
      .eq('week', week)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching existing pick:', fetchError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch existing pick' 
      })
    }

    if (!existingPick) {
      return NextResponse.json({ 
        success: false, 
        error: 'No pick found for this user, league, and week' 
      })
    }

    // Check if the game has already started (safety check)
    const { data: game } = await supabase
      .from('games')
      .select(`
        game_time,
        home_team:teams!games_home_team_id_fkey(city, name),
        away_team:teams!games_away_team_id_fkey(city, name)
      `)
      .eq('id', existingPick.game_id)
      .single()

    if (game) {
      const gameTime = new Date(game.game_time)
      const now = new Date()
      
      if (gameTime <= now) {
        const homeTeam = Array.isArray(game.home_team) ? game.home_team[0] : game.home_team
        const awayTeam = Array.isArray(game.away_team) ? game.away_team[0] : game.away_team
        
        return NextResponse.json({ 
          success: false, 
          error: `Cannot reset pick - Game has already started (${homeTeam?.city} ${homeTeam?.name} vs ${awayTeam?.city} ${awayTeam?.name})`,
          gameStarted: true
        })
      }
    }

    // Get league info for audit trail
    const { data: league } = await supabase
      .from('leagues')
      .select('name')
      .eq('id', leagueId)
      .single()

    // Delete the pick (this allows the user to pick again)
    const { error: deleteError } = await supabase
      .from('picks')
      .delete()
      .eq('id', existingPick.id)

    if (deleteError) {
      console.error('Error deleting pick:', deleteError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to reset pick' 
      })
    }

    // Create audit trail entry
    const auditData = {
      league_id: leagueId,
      user_id: userId,
      notification_type: 'pick_reset',
      title: `Pick Reset by Admin`,
      message: `${adminUsername} reset ${existingPick.users.display_name}'s Week ${week} pick (${existingPick.teams.city} ${existingPick.teams.name})`,
      metadata: {
        week: week,
        reset_by: adminUsername,
        original_pick: {
          team: `${existingPick.teams.city} ${existingPick.teams.name}`,
          team_key: existingPick.teams.key,
          game_id: existingPick.game_id
        },
        reset_at: new Date().toISOString()
      }
    }

    const { error: auditError } = await supabase
      .from('league_notifications')
      .insert(auditData)

    if (auditError) {
      console.warn('Failed to create audit trail:', auditError)
      // Don't fail the operation for audit issues
    }

    return NextResponse.json({
      success: true,
      message: `Successfully reset ${existingPick.users.display_name}'s Week ${week} pick`,
      resetPick: {
        user: existingPick.users.display_name,
        week: week,
        originalTeam: `${existingPick.teams.city} ${existingPick.teams.name}`,
        league: league?.name || 'Unknown League',
        resetBy: adminUsername,
        resetAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Pick reset error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    })
  }
}