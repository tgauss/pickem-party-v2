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
      
      // Calculate current week based on NFL schedule
      // NFL weeks run Tuesday morning to Monday night (inclusive)
      // Week 1: Sept 2-8, 2025 (Tues 12:00 AM - Mon 11:59 PM) - COMPLETED
      // Week 2: Sept 9-15, 2025 (Tues 12:00 AM - Mon 11:59 PM) - COMPLETED
      // Week 3: Sept 16-22, 2025 (Tues 12:00 AM - Mon 11:59 PM) - CURRENT
      const now = new Date()

      // Since Week 2 games are complete and picks processed, force Week 3 as current
      // Even though it's still Monday Sept 15, Week 2 is done
      let calculatedWeek = 3 // Week 3 is now active for picks

      // After Tuesday Sept 16, continue with normal week calculation
      const week3Start = new Date('2025-09-16T00:00:00')
      if (now >= week3Start) {
        const seasonStart = new Date('2025-09-02T00:00:00')
        const daysSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (24 * 60 * 60 * 1000))
        calculatedWeek = Math.min(Math.floor(daysSinceStart / 7) + 1, 18)
      }
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