'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CustomIcon } from '@/components/ui/custom-icon'
import { AdminControlWidget } from '@/components/AdminControlWidget'
import { WeekNavigation } from '@/components/WeekNavigation'
import { PastWeekResults } from '@/components/PastWeekResults'
import { CurrentWeekPicker } from '@/components/CurrentWeekPicker'
import { FutureWeekSchedule } from '@/components/FutureWeekSchedule'
import Image from 'next/image'

interface Team {
  team_id: number
  key: string
  city: string
  name: string
  full_name: string
  primary_color: string
  secondary_color: string
  logo_url: string
  conference: string
  division: string
}

interface Game {
  id: string
  week: number
  home_team: Team
  away_team: Team
  game_time: string
  home_team_id: number
  away_team_id: number
  home_score?: number | null
  away_score?: number | null
  is_final?: boolean
}

interface GameLine {
  homeTeam: string
  awayTeam: string
  spread: number
  overUnder: number
  homeMoneyLine: number
  awayMoneyLine: number
}

interface User {
  id: string
  username: string
  display_name: string
}

interface League {
  id: string
  name: string
  slug: string
  invite_code: string
  buy_in: number
  season_year: number
  max_weeks: number
  lives_per_player: number
}

interface Member {
  user: User
  lives_remaining: number
  is_eliminated: boolean
  eliminated_week?: number
  is_paid: boolean
}

interface Pick {
  id: string
  user_id: string
  league_id: string
  game_id: string
  team_id: number
  week: number
  is_correct?: boolean | null
  teams?: Team
  user?: User
}

export default function LeaguePage({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const resolvedParams = use(params)
  const [user, setUser] = useState<User | null>(null)
  const [league, setLeague] = useState<League | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [picks, setPicks] = useState<Pick[]>([])
  const [userPicks, setUserPicks] = useState<Pick[]>([])
  const [gameLines, setGameLines] = useState<Record<string, GameLine>>({})
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  
  // Week navigation state
  const [currentWeek, setCurrentWeek] = useState(1)
  const [selectedWeek, setSelectedWeek] = useState(1)
  
  const supabase = createClient()


  const loadWeekData = useCallback(async (week: number, leagueId: string, userId: string) => {
    setLoading(true)
    
    // Load games for the selected week
    const { data: gamesData } = await supabase
      .from('games')
      .select(`
        *,
        home_team:teams!games_home_team_id_fkey(*),
        away_team:teams!games_away_team_id_fkey(*)
      `)
      .eq('week', week)
      .eq('season_year', 2025) // Using 2025 data for testing
    
    setGames(gamesData || [])
    
    // Load picks for the selected week
    const { data: picksData } = await supabase
      .from('picks')
      .select(`
        *,
        teams(*),
        users(*)
      `)
      .eq('league_id', leagueId)
      .eq('week', week)
    
    setPicks(picksData || [])
    
    // Load user's picks history (all weeks) to track used teams
    const { data: userPicksData } = await supabase
      .from('picks')
      .select('*')
      .eq('user_id', userId)
      .eq('league_id', leagueId)
    
    setUserPicks(userPicksData || [])
    
    // Fetch betting lines for current/future weeks
    const now = new Date()
    const seasonStart = new Date('2025-09-04')
    const calculatedCurrentWeek = now < seasonStart ? 1 : Math.min(Math.max(1, 
      Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
    ), 18)
    
    if (week >= calculatedCurrentWeek) {
      try {
        const response = await fetch('/api/lines')
        const data = await response.json()
        if (data.success) {
          setGameLines(data.lines)
        }
      } catch (error) {
        console.error('Failed to fetch lines:', error)
      }
    }
    
    setLoading(false)
  }, [supabase])

  const loadLeagueData = useCallback(async (userId: string, slug: string) => {
    try {
      // Load league
      const { data: leagueData, error: leagueError } = await supabase
        .from('leagues')
        .select('*')
        .eq('slug', slug)
        .single()
      
      if (leagueError || !leagueData) {
        console.error('League query error:', leagueError)
        alert('League not found!')
        window.location.href = '/dashboard'
        return
      }
      
      setLeague(leagueData)
      
      // Load league members with proper typing
      const { data: membersData } = await supabase
        .from('league_members')
        .select(`
          *,
          users(*)
        `)
        .eq('league_id', leagueData.id)
      
      if (membersData) {
        const formattedMembers = membersData.map((m) => ({
          user: m.users as User,
          lives_remaining: m.lives_remaining || 0,
          is_eliminated: m.is_eliminated || false,
          eliminated_week: m.eliminated_week,
          is_paid: m.is_paid || false
        }))
        setMembers(formattedMembers)
      }
      
      // Calculate current week
      const now = new Date()
      const seasonStart = new Date('2025-09-04') // 2025 NFL season starts Sep 4th
      const weeksPassed = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
      // If before season start, show Week 1 as upcoming (current week for picking purposes)
      const calculatedWeek = now < seasonStart ? 1 : Math.min(Math.max(1, weeksPassed + 1), 18)
      setCurrentWeek(calculatedWeek)
      setSelectedWeek(calculatedWeek)
      
      // Load initial week data
      await loadWeekData(calculatedWeek, leagueData.id, userId)
      setInitialized(true)
    } catch (error) {
      console.error('Error loading league data:', error)
      alert('Error loading league data')
      window.location.href = '/dashboard'
    }
  }, [supabase, loadWeekData])

  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser')
    if (!currentUser) {
      window.location.href = '/'
      return
    }
    
    const userData = JSON.parse(currentUser)
    setUser(userData)
    loadLeagueData(userData.id, resolvedParams.slug)
  }, [loadLeagueData, resolvedParams.slug])

  useEffect(() => {
    if (league && user && selectedWeek && initialized) {
      loadWeekData(selectedWeek, league.id, user.id)
    }
  }, [selectedWeek, league, user, initialized, loadWeekData])

  const handleWeekChange = (week: number) => {
    setSelectedWeek(week)
  }

  const submitPick = async (teamId: number, gameId: string) => {
    if (!user || !league) {
      alert('Please log in first!')
      return
    }
    
    // Check if deadline has passed
    const game = games.find(g => g.id === gameId)
    if (game) {
      const now = new Date()
      const gameTime = new Date(game.game_time)
      if (gameTime <= now) {
        alert('⏰ DEADLINE PASSED! This game has already started.')
        return
      }
    }
    
    setLoading(true)
    
    try {
      // Check if user already has a pick for this week
      const existingPick = picks.find(p => 
        p.user_id === user.id && p.week === selectedWeek
      )

      if (existingPick) {
        // Update existing pick
        const { error } = await supabase
          .from('picks')
          .update({
            team_id: teamId,
            game_id: gameId
          })
          .eq('id', existingPick.id)
        
        if (error) {
          console.error('Update pick error:', error)
          alert('Failed to update pick: ' + error.message)
        } else {
          alert('PICK UPDATED! ⚔️')
          await loadWeekData(selectedWeek, league.id, user.id)
        }
      } else {
        // Create new pick
        const { error } = await supabase
          .from('picks')
          .insert({
            user_id: user.id,
            league_id: league.id,
            game_id: gameId,
            team_id: teamId,
            week: selectedWeek
          })
        
        if (error) {
          console.error('Create pick error:', error)
          alert('Failed to submit pick: ' + error.message)
        } else {
          alert('PICK SUBMITTED! ⚔️')
          await loadWeekData(selectedWeek, league.id, user.id)
        }
      }
    } catch (error) {
      console.error('Pick submission error:', error)
      alert('Network error submitting pick')
    }
    setLoading(false)
  }

  const submitAdminPick = async (userId: string, teamId: number, gameId: string) => {
    if (!user || !league) {
      alert('Admin not authorized!')
      return
    }

    // Check if deadline has passed
    const game = games.find(g => g.id === gameId)
    if (game) {
      const now = new Date()
      const gameTime = new Date(game.game_time)
      if (gameTime <= now) {
        alert('⏰ DEADLINE PASSED! This game has already started.')
        return
      }
    }
    
    setLoading(true)
    
    try {
      // Check if user already has a pick for this week
      const existingPick = picks.find(p => 
        p.user_id === userId && p.week === selectedWeek
      )

      if (existingPick) {
        // Update existing pick
        const { error } = await supabase
          .from('picks')
          .update({
            team_id: teamId,
            game_id: gameId
          })
          .eq('id', existingPick.id)
        
        if (error) {
          console.error('Admin update pick error:', error)
          alert('Failed to update pick: ' + error.message)
        } else {
          alert('ADMIN PICK SET! ⚔️')
          await loadWeekData(selectedWeek, league.id, user.id)
        }
      } else {
        // Create new pick
        const { error } = await supabase
          .from('picks')
          .insert({
            user_id: userId,
            league_id: league.id,
            game_id: gameId,
            team_id: teamId,
            week: selectedWeek
          })
        
        if (error) {
          console.error('Admin create pick error:', error)
          alert('Failed to set admin pick: ' + error.message)
        } else {
          alert('ADMIN PICK SET! ⚔️')
          await loadWeekData(selectedWeek, league.id, user.id)
        }
      }
    } catch (error) {
      console.error('Admin pick submission error:', error)
      alert('Network error setting admin pick')
    }
    setLoading(false)
  }

  if (!user || !league) return <div className="p-4">Loading arena...</div>

  // Determine what type of week view to show
  const getWeekViewType = () => {
    if (selectedWeek < currentWeek) return 'past'
    if (selectedWeek === currentWeek) return 'current'
    return 'future'
  }

  const weekViewType = getWeekViewType()
  const userCurrentPick = picks.find(p => p.user_id === user.id && p.week === selectedWeek)
  const usedTeamIds = userPicks.filter(p => p.week < selectedWeek).map(p => p.team_id)

  // Get bye week teams (simplified - would need actual schedule data)
  const byeWeekTeams: string[] = [] // TODO: Fetch from actual schedule

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <Image 
              src="/logos/Pickem Part App Logo.svg" 
              alt="Pickem Party Logo"
              width={80}
              height={80}
              className="mx-auto"
            />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{color: 'var(--primary)'}}>
            {league.name.toUpperCase()}
          </h1>
          <p className="text-muted-foreground">
            {members.filter(m => !m.is_eliminated).length} FIGHTERS REMAIN
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Invite Code: <strong>{league.invite_code}</strong>
          </p>
        </div>

        {/* Week Navigation */}
        <WeekNavigation
          currentWeek={currentWeek}
          selectedWeek={selectedWeek}
          onWeekChange={handleWeekChange}
          maxWeek={18}
          minWeek={1}
        />

        {/* Conditional Week Views */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading week {selectedWeek} data...</p>
          </div>
        ) : (
          <>
            {weekViewType === 'past' && (
              <PastWeekResults
                week={selectedWeek}
                games={games}
                picks={picks as (Pick & { user: User })[]}
                members={members}
                gameLines={gameLines}
              />
            )}

            {weekViewType === 'current' && (
              <>
                {/* Admin Control Widget - only shows to admins */}
                <AdminControlWidget
                  currentUser={user}
                  league={league}
                  members={members}
                  membersWithoutPicks={members.filter(member =>
                    !member.is_eliminated && !picks.some(pick => pick.user_id === member.user.id)
                  )}
                  onAdminPickSubmit={submitAdminPick}
                />
                
                <CurrentWeekPicker
                  week={selectedWeek}
                  games={games}
                  usedTeamIds={usedTeamIds}
                  currentPick={userCurrentPick}
                  gameLines={gameLines}
                  byeWeekTeams={byeWeekTeams}
                  members={members}
                  picks={picks}
                  onPickSubmit={submitPick}
                />
              </>
            )}

            {weekViewType === 'future' && (
              <FutureWeekSchedule
                week={selectedWeek}
                games={games}
                gameLines={gameLines}
                byeWeekTeams={byeWeekTeams}
              />
            )}
          </>
        )}

        {/* League Standings */}
        <Card className="mt-6">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">League Standings</h2>
            <div className="space-y-2">
              {members
                .sort((a, b) => {
                  if (a.is_eliminated && !b.is_eliminated) return 1
                  if (!a.is_eliminated && b.is_eliminated) return -1
                  return b.lives_remaining - a.lives_remaining
                })
                .map((member, index) => (
                  <div 
                    key={member.user.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      member.is_eliminated ? 'bg-muted opacity-50' : 'bg-background'
                    } border`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm">#{index + 1}</span>
                      <span className="font-medium">{member.user.display_name}</span>
                      {member.is_eliminated && (
                        <Badge variant="destructive" className="text-xs">
                          Eliminated Week {member.eliminated_week}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.max(0, member.lives_remaining) }).map((_, index) => (
                          <CustomIcon 
                            key={index}
                            name="heart" 
                            fallback="❤️" 
                            alt="Life remaining"
                            size="sm"
                          />
                        ))}
                      </div>
                      {!member.is_paid && (
                        <Badge variant="outline" className="text-xs">
                          Unpaid
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </Card>

        {/* Back to Dashboard */}
        <div className="text-center mt-8">
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/dashboard'}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}