'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CustomIcon } from '@/components/ui/custom-icon'
import { AdminControlWidget } from '@/components/AdminControlWidget'
import { WeekNavigation } from '@/components/WeekNavigation'
import { backupPickToSheets, getTeamDetailsForBackup } from '@/lib/utils/backup'
import { PastWeekResults } from '@/components/PastWeekResults'
import { CurrentWeekPicker } from '@/components/CurrentWeekPicker'
import { FutureWeekSchedule } from '@/components/FutureWeekSchedule'
import { LeagueActivityLog } from '@/components/LeagueActivityLog'
import LiveScores from '@/components/LiveScores'
import { Cemetery } from '@/components/Cemetery'
import { RIPPopup } from '@/components/RIPPopup'
import { useAutoScoreSync } from '@/hooks/useAutoScoreSync'
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
  league_message?: string
  commissioner_id?: string
  picks_revealed_weeks?: number[]
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
  
  // Commissioner message editing state
  const [isEditingMessage, setIsEditingMessage] = useState(false)
  const [draftMessage, setDraftMessage] = useState('')
  const [savingMessage, setSavingMessage] = useState(false)
  
  // Week navigation state
  const [currentWeek, setCurrentWeek] = useState(1)
  const [selectedWeek, setSelectedWeek] = useState(1)

  const supabase = createClient()

  // Auto-sync scores on page load and periodically for live games
  const { syncScores, isSyncing, lastSync, syncResult } = useAutoScoreSync(true)


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
      .eq('season_year', 2025) // Using 2025-26 NFL season
    
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
        const response = await fetch(`/api/betting-lines?week=${week}&season=2025`)
        const data = await response.json()
        if (data.success) {
          setGameLines(data.lines)
        }
      } catch (error) {
        console.error('Failed to fetch betting lines:', error)
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
      
      // Calculate current NFL week
      // Week 5 completed (Oct 6 MNF final), force Week 6 as current
      const now = new Date()
      let calculatedWeek = 6 // Week 6 is now active for picks

      // After Tuesday Oct 14, continue with normal week calculation
      const week6Start = new Date('2025-10-14T00:00:00')
      if (now >= week6Start) {
        const seasonStart = new Date('2025-09-02T00:00:00')
        const daysSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (24 * 60 * 60 * 1000))
        calculatedWeek = Math.min(Math.floor(daysSinceStart / 7) + 1, 18)
      }

      // Wild Card Playoffs - Week 19 (January 10-13, 2026)
      const wildCardStart = new Date('2026-01-07T00:00:00')
      if (now >= wildCardStart) {
        calculatedWeek = 19
      }

      console.log('Week calculation:', {
        now: now.toISOString(),
        calculatedWeek,
        note: 'Week 5 completed - Week 6 forced as current'
      })
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
    
    // Check if user has already used this team in a previous week
    const teamAlreadyUsed = userPicks.some(pick => 
      pick.team_id === teamId && pick.week < selectedWeek
    )
    
    if (teamAlreadyUsed) {
      // Get team name for better error message
      const teamName = games.flatMap(g => [g.home_team, g.away_team])
        .find(t => t.team_id === teamId)
      const displayName = teamName ? `${teamName.city} ${teamName.name}` : 'this team'
      
      alert(`🔒 TEAM ALREADY USED! You picked ${displayName} in a previous week. In Survivor pools, you can only use each team once per season.`)
      return
    }

    // Check if deadline has passed
    const game = games.find(g => g.id === gameId)
    if (game) {
      const now = new Date()
      const gameTime = new Date(game.game_time)

      // Debug logging to understand the timezone issue
      console.log('Pick submission check:', {
        gameId,
        gameTimeString: game.game_time,
        gameTimeObj: gameTime.toISOString(),
        gameTimeLocal: gameTime.toLocaleString(),
        nowObj: now.toISOString(),
        nowLocal: now.toLocaleString(),
        hasStarted: gameTime <= now,
        timeDiffMinutes: (gameTime.getTime() - now.getTime()) / (1000 * 60)
      })

      if (gameTime <= now) {
        alert(`⏰ DEADLINE PASSED! This game has already started.\n\nGame time: ${gameTime.toLocaleString()}\nCurrent time: ${now.toLocaleString()}`)
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
          // Add activity log for pick update (without revealing the pick)
          await supabase
            .from('league_notifications')
            .insert({
              league_id: league.id,
              user_id: user.id,
              notification_type: 'pick_updated',
              title: `${user.display_name} Updated Their Pick`,
              message: `${user.display_name} changed their Week ${selectedWeek} pick.`,
              metadata: {
                week: selectedWeek,
                updated_at: new Date().toISOString()
              }
            })
          
          // Backup pick to Google Sheets
          const teamDetails = getTeamDetailsForBackup(teamId, games.flatMap(g => [g.home_team, g.away_team]))
          backupPickToSheets({
            user_id: user.id,
            username: user.username,
            display_name: user.display_name,
            league_id: league.id,
            league_name: league.name,
            week: selectedWeek,
            team_id: teamId,
            team_name: teamDetails.name,
            team_key: teamDetails.key,
            is_update: true
          })
          
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
          // Add activity log for new pick submission (without revealing the pick)
          await supabase
            .from('league_notifications')
            .insert({
              league_id: league.id,
              user_id: user.id,
              notification_type: 'pick_submitted',
              title: `${user.display_name} Submitted Their Pick`,
              message: `${user.display_name} locked in their Week ${selectedWeek} pick.`,
              metadata: {
                week: selectedWeek,
                submitted_at: new Date().toISOString()
              }
            })
          
          // Backup pick to Google Sheets
          const teamDetails = getTeamDetailsForBackup(teamId, games.flatMap(g => [g.home_team, g.away_team]))
          backupPickToSheets({
            user_id: user.id,
            username: user.username,
            display_name: user.display_name,
            league_id: league.id,
            league_name: league.name,
            week: selectedWeek,
            team_id: teamId,
            team_name: teamDetails.name,
            team_key: teamDetails.key,
            is_update: false
          })
          
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

      // Debug logging for admin picks
      console.log('Admin pick submission check:', {
        gameId,
        gameTimeString: game.game_time,
        gameTimeObj: gameTime.toISOString(),
        nowObj: now.toISOString(),
        hasStarted: gameTime <= now,
        timeDiffMinutes: (gameTime.getTime() - now.getTime()) / (1000 * 60)
      })

      if (gameTime <= now) {
        alert(`⏰ DEADLINE PASSED! This game has already started.\n\nGame time: ${gameTime.toLocaleString()}\nCurrent time: ${now.toLocaleString()}`)
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

  const saveLeagueMessage = async () => {
    if (!league) return
    
    setSavingMessage(true)
    try {
      const { error } = await supabase
        .from('leagues')
        .update({ league_message: draftMessage })
        .eq('id', league.id)
      
      if (error) {
        alert('Failed to save message: ' + error.message)
      } else {
        setLeague({ ...league, league_message: draftMessage })
        setIsEditingMessage(false)
        alert('League message updated successfully!')
      }
    } catch (error) {
      console.error('Error saving message:', error)
      alert('Failed to save message')
    }
    setSavingMessage(false)
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

  // Get eliminated members for cemetery and RIP popup
  const eliminatedMembers = members.filter(m => m.is_eliminated)
  const eliminatedThisWeek = members.filter(m => m.is_eliminated && m.eliminated_week === currentWeek)

  // Season start date (first game of NFL season)
  const seasonStartDate = new Date('2025-09-04') // Week 1 Thursday Night Game

  // Check if we're in playoff mode (Week 19+)
  const isPlayoffMode = selectedWeek >= 19
  const activeMembers = members.filter(m => !m.is_eliminated)

  // Playoff Mode UI
  if (isPlayoffMode && currentWeek >= 19) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0B0E0C] via-[#1a1d1a] to-[#0B0E0C] p-2 sm:p-4">
        {/* RIP Popup for newly eliminated players */}
        <RIPPopup
          eliminatedThisWeek={eliminatedThisWeek}
          currentWeek={currentWeek}
          onClose={() => {}}
        />

        <div className="max-w-4xl mx-auto">
          {/* Playoff Header */}
          <div className="text-center mb-6">
            <div className="mb-3">
              <div className="text-6xl sm:text-8xl mb-2">🏆</div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-400 bg-clip-text text-transparent">
                PLAYOFF MODE
              </h1>
              <p className="text-yellow-500/80 text-sm sm:text-base font-medium mt-1">
                Wild Card Round
              </p>
            </div>

            {/* Remaining Fighters Count */}
            <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-2 mb-4">
              <span className="text-2xl">⚔️</span>
              <span className="text-yellow-400 font-bold text-lg">
                {activeMembers.length} FIGHTER{activeMembers.length !== 1 ? 'S' : ''} REMAIN
              </span>
              <span className="text-2xl">⚔️</span>
            </div>

            {/* Live Score Sync Status */}
            {isSyncing && (
              <div className="flex items-center justify-center gap-2 mb-3 text-xs text-yellow-500/70">
                <div className="animate-spin">⚡</div>
                <span>Syncing playoff scores...</span>
              </div>
            )}
          </div>

          {/* The Final Contenders */}
          <Card className="mb-6 bg-gradient-to-br from-yellow-500/10 via-transparent to-yellow-500/5 border-yellow-500/30">
            <div className="p-4 sm:p-6">
              <h2 className="text-center text-lg sm:text-xl font-bold text-yellow-400 mb-4 flex items-center justify-center gap-2">
                <span>👑</span> THE FINAL CONTENDERS <span>👑</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {activeMembers.map((member, index) => (
                  <div
                    key={member.user.id}
                    className={`relative p-4 rounded-xl border-2 text-center ${
                      member.user.id === user.id
                        ? 'bg-yellow-500/20 border-yellow-500 shadow-lg shadow-yellow-500/20'
                        : 'bg-surface/50 border-border'
                    }`}
                  >
                    {member.user.id === user.id && (
                      <div className="absolute -top-2 -right-2 text-xl">⭐</div>
                    )}
                    <div className="text-3xl mb-2">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </div>
                    <p className="font-bold text-base sm:text-lg">{member.user.display_name}</p>
                    <p className="text-xs text-muted-foreground">@{member.user.username}</p>
                    <div className="flex items-center justify-center gap-1 mt-2">
                      {Array.from({ length: member.lives_remaining }).map((_, i) => (
                        <span key={i} className="text-lg">❤️</span>
                      ))}
                    </div>
                    <p className="text-xs text-yellow-500/70 mt-1">
                      {member.lives_remaining} {member.lives_remaining === 1 ? 'life' : 'lives'} remaining
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Week Navigation - Simplified for Playoffs */}
          <div className="bg-surface rounded-lg border border-yellow-500/30 mb-4 p-3">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleWeekChange(Math.max(1, selectedWeek - 1))}
                disabled={selectedWeek <= 1}
              >
                <span className="text-xl">◀</span>
              </Button>
              <div className="text-center">
                <p className="text-xs text-yellow-500/70 uppercase tracking-wider">
                  {selectedWeek >= 19 ? 'Playoff Week' : 'Regular Season'}
                </p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-400">
                  {selectedWeek === 19 ? 'Wild Card' : `Week ${selectedWeek}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleWeekChange(Math.min(22, selectedWeek + 1))}
                disabled={selectedWeek >= 22}
              >
                <span className="text-xl">▶</span>
              </Button>
            </div>
            {selectedWeek !== currentWeek && (
              <div className="text-center mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleWeekChange(currentWeek)}
                  className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                >
                  Jump to Current Week
                </Button>
              </div>
            )}
          </div>

          {/* Conditional Week Views */}
          {loading ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-2 animate-bounce">🏈</div>
              <p className="text-yellow-500/70">Loading playoff matchups...</p>
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
                  {/* Your Pick Status */}
                  {userCurrentPick ? (
                    <Card className="mb-4 bg-green-500/10 border-green-500/30">
                      <div className="p-4 text-center">
                        <div className="text-3xl mb-2">✅</div>
                        <p className="text-green-400 font-bold">PICK LOCKED IN!</p>
                        <p className="text-sm text-muted-foreground">
                          You picked: <span className="text-green-400 font-medium">
                            {userCurrentPick.teams?.city} {userCurrentPick.teams?.name}
                          </span>
                        </p>
                      </div>
                    </Card>
                  ) : (
                    <Card className="mb-4 bg-red-500/10 border-red-500/30 animate-pulse">
                      <div className="p-4 text-center">
                        <div className="text-3xl mb-2">⚠️</div>
                        <p className="text-red-400 font-bold">NO PICK YET!</p>
                        <p className="text-sm text-muted-foreground">
                          Make your playoff pick below before games start
                        </p>
                      </div>
                    </Card>
                  )}

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
                    league={league}
                    currentUser={user}
                  />

                  {/* Live Scores Component */}
                  <LiveScores week={selectedWeek} className="mt-4" />
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

          {/* Fallen Warriors Section (Simplified Cemetery) */}
          {eliminatedMembers.length > 0 && (
            <Card className="mt-6 bg-surface/50 border-border/50">
              <div className="p-4">
                <h3 className="text-center text-sm font-bold text-muted-foreground mb-3 flex items-center justify-center gap-2">
                  <span>💀</span> FALLEN WARRIORS <span>💀</span>
                </h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {eliminatedMembers.map(member => (
                    <div
                      key={member.user.id}
                      className="bg-muted/30 rounded-lg px-3 py-1.5 text-xs text-muted-foreground"
                    >
                      <span className="opacity-50">RIP</span> {member.user.display_name}
                      <span className="opacity-50 ml-1">(Week {member.eliminated_week})</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-6 mb-20">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = `/league/${resolvedParams.slug}/schedule`}
              className="border-yellow-500/30 text-yellow-400/70 hover:bg-yellow-500/10"
            >
              📅 Full Schedule
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleWeekChange(18)}
              className="border-yellow-500/30 text-yellow-400/70 hover:bg-yellow-500/10"
            >
              📜 Regular Season
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/dashboard'}
              className="border-border text-muted-foreground hover:bg-surface"
            >
              ← Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4">
      {/* RIP Popup for newly eliminated players */}
      <RIPPopup
        eliminatedThisWeek={eliminatedThisWeek}
        currentWeek={currentWeek}
        onClose={() => {}}
      />

      <div className="max-w-6xl mx-auto">
        {/* Header - Compact */}
        <div className="text-center mb-3 sm:mb-4">
          <div className="mb-2">
            <Image 
              src="/logos/Pickem Part App Logo.svg" 
              alt="Pickem Party Logo"
              width={50}
              height={50}
              className="mx-auto sm:w-16 sm:h-16"
            />
          </div>
          <h1 className="text-lg sm:text-xl font-bold mb-1" style={{color: 'var(--primary)'}}>
            {league.name.toUpperCase()}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mb-2">
            {members.filter(m => !m.is_eliminated).length} FIGHTERS REMAIN
          </p>

          {/* Live Score Sync Status */}
          {isSyncing && (
            <div className="flex items-center justify-center gap-2 mb-2 text-xs text-muted-foreground">
              <div className="animate-spin">⚡</div>
              <span>Syncing live scores...</span>
            </div>
          )}
          {!isSyncing && syncResult?.success && (syncResult.liveGames ?? 0) > 0 && (
            <div className="flex items-center justify-center gap-2 mb-2 text-xs text-green-600">
              <span>🔴 LIVE</span>
              <span>{syncResult.liveGames} game{syncResult.liveGames !== 1 ? 's' : ''} in progress</span>
              {lastSync && (
                <span className="text-muted-foreground">
                  • Updated {new Date(lastSync).toLocaleTimeString()}
                </span>
              )}
            </div>
          )}
          {!isSyncing && syncResult?.success && (syncResult.updatedGames ?? 0) > 0 && (syncResult.liveGames ?? 0) === 0 && (
            <div className="flex items-center justify-center gap-2 mb-2 text-xs text-blue-600">
              <span>✅</span>
              <span>Scores updated • {syncResult.completedGames ?? 0} game{(syncResult.completedGames ?? 0) !== 1 ? 's' : ''} final</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <p className="text-xs text-muted-foreground">
              Code: <strong>{league.invite_code}</strong>
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const inviterName = encodeURIComponent(user.display_name || user.username)
                const inviteUrl = `${window.location.origin}/?invite=${league.invite_code}&inviter=${inviterName}`
                navigator.clipboard.writeText(inviteUrl)
                alert('📋 Invite link copied to clipboard!')
              }}
              className="flex items-center gap-1 text-xs px-2 py-1"
            >
              <CustomIcon name="copy" fallback="📋" alt="Copy" size="sm" />
              Copy Link
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = `/league/${resolvedParams.slug}/schedule`}
              className="flex items-center gap-1 text-xs px-2 py-1"
            >
              <CustomIcon name="calendar" fallback="📅" alt="Schedule" size="sm" />
              View Schedule
            </Button>
            {(user && league && (user.id === league.commissioner_id || ['admin', 'tgauss', 'pickemking'].includes(user.username.toLowerCase()))) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncScores(true)}
                disabled={isSyncing}
                className="flex items-center gap-1 text-xs px-2 py-1"
              >
                <span className={isSyncing ? 'animate-spin' : ''}>🔄</span>
                {isSyncing ? 'Syncing...' : 'Refresh Scores'}
              </Button>
            )}
            {currentWeek > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = `/league/${resolvedParams.slug}/recap/${currentWeek - 1}`}
                className="flex items-center gap-1 text-xs px-2 py-1 bg-purple-600/20 border-purple-500/50 hover:bg-purple-600/30"
              >
                <CustomIcon name="music" fallback="🎵" alt="Recap" size="sm" />
                Week {currentWeek - 1} Recap
              </Button>
            )}
          </div>
        </div>

        {/* League Message/Announcements - Commissioner Section */}
        <Card className="mb-3 sm:mb-4 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30">
          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CustomIcon name="megaphone" fallback="📢" alt="Announcement" size="sm" />
                <h3 className="font-bold text-primary">League Commissioner</h3>
              </div>
              {/* Show edit button only for commissioner or super admin */}
              {(user.id === league.commissioner_id || ['admin', 'tgauss', 'pickemking'].includes(user.username.toLowerCase())) && !isEditingMessage && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEditingMessage(true)
                    setDraftMessage(league.league_message || '')
                  }}
                  className="flex items-center gap-1"
                >
                  <CustomIcon name="edit" fallback="✏️" alt="Edit" size="sm" />
                  Edit
                </Button>
              )}
            </div>
            <div className="text-sm space-y-1">
              <p className="text-xs">
                <strong>Commissioner:</strong> League Creator
              </p>
              <div className="bg-surface/50 rounded-lg p-2 border border-border">
                <p className="text-xs text-muted-foreground mb-1">📋 LEAGUE INFORMATION:</p>
                {isEditingMessage ? (
                  <div className="space-y-2">
                    <textarea
                      value={draftMessage}
                      onChange={(e) => setDraftMessage(e.target.value)}
                      className="w-full min-h-[100px] p-2 bg-background border border-border rounded-lg text-xs text-primary resize-y"
                      placeholder="Enter league information, rules, payment details, etc..."
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={saveLeagueMessage}
                        disabled={savingMessage}
                        className="flex-1"
                      >
                        {savingMessage ? 'Saving...' : 'Save Message'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsEditingMessage(false)
                          setDraftMessage('')
                        }}
                        disabled={savingMessage}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs whitespace-pre-wrap">
                    {league.league_message && league.league_message.trim() ? league.league_message : (
                      <>
                        Welcome fighters! This is your league commissioner speaking. 
                        Rules: Standard NFL Survivor - pick ONE team each week that you think will WIN. 
                        If they lose or tie, you&apos;re ELIMINATED! You can only use each team ONCE per season.
                        <br /><br />
                        💰 <strong>Payment:</strong> Venmo @YourCommissioner for the ${league.buy_in} buy-in
                        <br />
                        📅 <strong>Important:</strong> All picks must be submitted before the first game of each week!
                        <br />
                        🏆 <strong>Prize:</strong> Winner takes the full pot (${league.buy_in} × {members.length} fighters)
                      </>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Week Navigation */}
        <WeekNavigation
          currentWeek={currentWeek}
          selectedWeek={selectedWeek}
          onWeekChange={handleWeekChange}
          maxWeek={19}
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
                  games={games}
                  usedTeamIds={usedTeamIds}
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
                  league={league}
                  currentUser={user}
                />
                
                {/* Live Scores Component */}
                <LiveScores week={selectedWeek} className="mt-3 sm:mt-4" />
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
        <Card className="mt-3 sm:mt-4">
          <div className="p-3 sm:p-4">
            <h2 className="text-base sm:text-lg font-bold mb-2 sm:mb-3">League Standings</h2>
            <div className="space-y-1">
              {members
                .sort((a, b) => {
                  if (a.is_eliminated && !b.is_eliminated) return 1
                  if (!a.is_eliminated && b.is_eliminated) return -1
                  return b.lives_remaining - a.lives_remaining
                })
                .map((member, index, sortedArray) => {
                  // Calculate tied position
                  let position = 1
                  if (!member.is_eliminated) {
                    // Count how many players have more lives
                    position = sortedArray.filter(m =>
                      !m.is_eliminated && m.lives_remaining > member.lives_remaining
                    ).length + 1
                  } else {
                    // Eliminated players don't get a ranking
                    position = 0
                  }

                  return (
                    <div
                      key={member.user.id}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        member.is_eliminated ? 'bg-muted opacity-50' : 'bg-background'
                      } border`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs w-8">
                          {position > 0 ? `#${position}` : '—'}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{member.user.username}</span>
                          <span className="text-xs text-muted-foreground">{member.user.display_name}</span>
                        </div>
                        {member.is_eliminated && (
                          <Badge variant="destructive" className="text-xs px-2 py-0.5">
                            Eliminated Week {member.eliminated_week}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-0.5">
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
                          <Badge variant="outline" className="text-xs px-2 py-0.5">
                            Unpaid
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </Card>

        {/* League Activity Log */}
        <LeagueActivityLog
          leagueId={league.id}
          className="mt-3 sm:mt-4"
        />

        {/* Cemetery Section */}
        <Cemetery
          eliminatedMembers={eliminatedMembers}
          seasonStartDate={seasonStartDate}
          currentWeek={currentWeek}
        />

        {/* Back to Dashboard */}
        <div className="text-center mt-4 mb-20">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/dashboard'}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}