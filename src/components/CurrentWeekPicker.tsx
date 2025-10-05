'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CustomIcon } from '@/components/ui/custom-icon'
import { WeekCountdown } from '@/components/WeekCountdown'
import { formatSpreadToNaturalLanguage, getSpreadConfidenceIndicator } from '@/lib/utils/betting-lines'
import { Star, Clock, AlertTriangle, TrendingUp, TrendingDown, Users, Target, Lock, ChevronRight, Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'

interface Team {
  team_id: number
  key: string
  city: string
  name: string
  full_name: string
  logo_url?: string
}

interface Game {
  id: string
  home_team: Team
  away_team: Team
  game_time: string
  home_team_id: number
  away_team_id: number
  home_score?: number | null
  away_score?: number | null
  is_final?: boolean
  game_status?: string | null
}

interface Member {
  user: {
    id: string
    username: string
    display_name: string
  }
  lives_remaining: number
  is_eliminated: boolean
  eliminated_week?: number
  is_paid: boolean
}

interface Pick {
  id: string
  user_id: string
  team_id: number
  teams?: Team
  user?: {
    id: string
    username: string
    display_name: string
  }
  users?: {
    id: string
    username: string
    display_name: string
  }
}

interface CurrentWeekPickerProps {
  week: number
  games: Game[]
  teams?: Team[]
  usedTeamIds: number[]
  currentPick?: { team_id: number, teams?: Team }
  gameLines?: Record<string, { 
    gameId?: string
    spread: number
    homeTeam: string
    awayTeam: string
    overUnder?: number
    homeMoneyLine?: number
    awayMoneyLine?: number
    fetchedAt?: string
  }>
  byeWeekTeams?: string[]
  members: Member[]
  picks: Pick[]
  onPickSubmit: (teamId: number, gameId: string) => void
  league?: {
    id: string
    name: string
    commissioner_id?: string
    picks_revealed_weeks?: number[]
  }
  currentUser?: {
    id: string
    username: string
    display_name: string
  }
}

export function CurrentWeekPicker({ 
  week, 
  games,
  usedTeamIds, 
  currentPick,
  gameLines,
  byeWeekTeams = [],
  members,
  picks,
  onPickSubmit,
  league,
  currentUser
}: CurrentWeekPickerProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(currentPick?.team_id || null)
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [revealingPicks, setRevealingPicks] = useState(false)

  const handleRevealPicks = async () => {
    if (!league || !currentUser || revealingPicks) return
    
    setRevealingPicks(true)
    
    try {
      const response = await fetch('/api/admin/reveal-picks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          leagueId: league.id,
          week: week,
          userId: currentUser.id
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Refresh the page to show updated state
        window.location.reload()
      } else {
        console.error('Failed to reveal picks:', result.error)
        alert(result.error || 'Failed to reveal picks')
      }
    } catch (error) {
      console.error('Error revealing picks:', error)
      alert('Failed to reveal picks')
    } finally {
      setRevealingPicks(false)
    }
  }

  const getTeamHelmet = (teamKey: string) => {
    const helmetMap: Record<string, string> = {
      'ARI': 'Arizona.gif',
      'ATL': 'Atlanta.gif',
      'BAL': 'Baltimore.gif',
      'BUF': 'Buffalo.gif',
      'CAR': 'Carolina.gif',
      'CHI': 'Chicago.gif',
      'CIN': 'Cincinnati.gif',
      'CLE': 'Cleveland.gif',
      'DAL': 'Dallas.gif',
      'DEN': 'Denver.gif',
      'DET': 'Detroit.gif',
      'GB': 'GreenBay.gif',
      'HOU': 'Houston.gif',
      'IND': 'Indianapolis.gif',
      'JAX': 'Jacksonville.gif',
      'KC': 'KansasCity.gif',
      'LV': 'LasVegas.gif',
      'LAC': 'LosAngelesChargers.gif',
      'LAR': 'LosAngelesRams.gif',
      'MIA': 'Miami.gif',
      'MIN': 'Minnesota.gif',
      'NE': 'NewEngland.gif',
      'NO': 'NewOrleans.gif',
      'NYG': 'NewYorkGiants.gif',
      'NYJ': 'NewYorkJets.gif',
      'PHI': 'Philadelphia.gif',
      'PIT': 'Pittsburgh.gif',
      'SF': 'SanFrancisco.gif',
      'SEA': 'Seattle.gif',
      'TB': 'TampaBay.gif',
      'TEN': 'Tennessee.gif',
      'WAS': 'Washington.gif'
    }
    return `/team-helmets/${helmetMap[teamKey] || 'Arizona.gif'}`
  }

  const getSpreadDisplay = (game: Game, teamId: number) => {
    const gameKey = `${game.away_team.key}@${game.home_team.key}`
    const line = gameLines?.[gameKey]
    if (!line) return null

    const isHome = teamId === game.home_team_id
    const spread = line.spread
    
    if (isHome) {
      if (spread < 0) {
        return { text: `Favored by ${Math.abs(spread)}`, type: 'favorite' }
      } else if (spread > 0) {
        return { text: `Underdog +${spread}`, type: 'underdog' }
      } else {
        return { text: 'Pick\'em', type: 'even' }
      }
    } else {
      // Away team - opposite of home spread
      if (spread > 0) {
        return { text: `Favored by ${spread}`, type: 'favorite' }
      } else if (spread < 0) {
        return { text: `Underdog +${Math.abs(spread)}`, type: 'underdog' }
      } else {
        return { text: 'Pick\'em', type: 'even' }
      }
    }
  }

  const handleTeamSelect = (teamId: number, gameId: string) => {
    setSelectedTeamId(teamId)
    setSelectedGameId(gameId)
  }

  const handleSubmit = () => {
    if (selectedTeamId && selectedGameId) {
      onPickSubmit(selectedTeamId, selectedGameId)
      setSelectedTeamId(null)
      setSelectedGameId(null)
    }
  }

  // Get the selected team info
  const getSelectedTeamInfo = () => {
    if (!selectedTeamId) return null
    
    for (const game of games) {
      if (game.home_team_id === selectedTeamId) {
        return game.home_team
      }
      if (game.away_team_id === selectedTeamId) {
        return game.away_team
      }
    }
    return null
  }

  const getGameOutcomeAnalysis = (game: Game, line: { 
    gameId?: string
    spread: number
    homeTeam: string
    awayTeam: string
    overUnder?: number
    homeMoneyLine?: number
    awayMoneyLine?: number
    fetchedAt?: string
  }) => {
    if (!line || !game.is_final) return null
    
    const homeScore = game.home_score ?? 0
    const awayScore = game.away_score ?? 0
    const actualMargin = homeScore - awayScore // Positive = home won, negative = away won
    const spread = line.spread // Positive = home underdog (getting points), negative = home favored (giving points)

    // Determine if it was an upset
    // Upset occurs when underdog wins outright
    const isUpset = (spread < 0 && actualMargin <= 0) || (spread > 0 && actualMargin >= 0)
    const coverSpread = actualMargin > spread

    // Calculate upset magnitude
    const upsetMagnitude = Math.abs(spread)
    let upsetSize = ''
    if (isUpset) {
      if (upsetMagnitude >= 10) upsetSize = 'MAJOR'
      else if (upsetMagnitude >= 6) upsetSize = 'BIG'
      else if (upsetMagnitude >= 3) upsetSize = 'SMALL'
      else upsetSize = 'MINOR'
    }

    // Determine favorite and underdog
    const homeFavored = spread < 0  // Negative spread = home favored
    const favoriteTeam = homeFavored ? game.home_team : game.away_team
    const underdogTeam = homeFavored ? game.away_team : game.home_team
    const winner = actualMargin > 0 ? game.home_team : game.away_team
    
    if (spread === 0) {
      // Pick'em game
      return {
        type: 'pickem',
        message: `Pick'em game - ${winner.city} ${winner.name} won by ${Math.abs(actualMargin)} points`,
        isUpset: false,
        upsetSize: '',
        covered: true
      }
    }
    
    if (isUpset) {
      return {
        type: 'upset',
        message: `${upsetSize} UPSET! ${underdogTeam.city} ${underdogTeam.name} (+${Math.abs(spread)}) beat ${favoriteTeam.city} ${favoriteTeam.name}`,
        isUpset: true,
        upsetSize,
        covered: actualMargin > spread
      }
    } else {
      const coverText = coverSpread ? 'covered the spread' : 'won but didn\'t cover'
      return {
        type: 'favorite',
        message: `${favoriteTeam.city} ${favoriteTeam.name} ${coverText} (${spread > 0 ? '-' : '+'}${Math.abs(spread)})`,
        isUpset: false,
        upsetSize: '',
        covered: coverSpread
      }
    }
  }

  const selectedTeam = getSelectedTeamInfo()

  // Get active (non-eliminated) members
  const activeMembers = members.filter(member => !member.is_eliminated)
  
  // Get members who have made picks this week
  const membersWithPicks = activeMembers.filter(member => 
    picks.some(pick => pick.user_id === member.user.id)
  )
  
  // Get members who haven't made picks yet
  const membersWithoutPicks = activeMembers.filter(member =>
    !picks.some(pick => pick.user_id === member.user.id)
  )
  
  
  // Check if picks have been manually revealed for this week
  const picksManuallyRevealed = league?.picks_revealed_weeks?.includes(week) || false
  
  // Determine if picks should be private (not revealed by commissioner yet)
  const picksArePrivate = !picksManuallyRevealed
  
  // Check if current user is authorized to reveal picks (commissioner or super admin)
  const canRevealPicks = currentUser && league && (
    league.commissioner_id === currentUser.id || 
    ['admin', 'tgauss', 'pickemking'].includes(currentUser.username.toLowerCase())
  )

  const availableGames = games.filter(game => {
    const homeAvailable = !usedTeamIds.includes(game.home_team_id)
    const awayAvailable = !usedTeamIds.includes(game.away_team_id)
    return homeAvailable || awayAvailable
  })

  const getGameTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    })
  }

  return (
    <div className={`space-y-6 ${selectedTeamId && !currentPick ? 'pb-24' : ''}`}>
      {/* Countdown Timer */}
      <WeekCountdown week={week} />
      
      {/* Pick Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Week {week} Pick Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{membersWithPicks.length}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Picks Submitted</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-orange-600">{membersWithoutPicks.length}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Still Pending</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold">{activeMembers.length}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Total Active</div>
            </div>
          </div>

          {/* Members Status List */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-medium">Player Status:</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeMembers.map(member => {
                const hasPick = picks.some(pick => pick.user_id === member.user.id)
                const memberPick = picks.find(pick => pick.user_id === member.user.id)
                
                return (
                  <div
                    key={member.user.id}
                    className={`flex items-center justify-between p-2 rounded-lg border ${
                      hasPick ? 'bg-surface border-primary/30' : 'bg-surface border-secondary/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {hasPick ? (
                        <CustomIcon name="checkmark" fallback="✅" alt="Picked" size="sm" />
                      ) : (
                        <CustomIcon name="hourglass" fallback="⏰" alt="Waiting" size="sm" />
                      )}
                      <span className={`text-xs sm:text-sm font-medium ${
                        hasPick ? 'text-primary' : 'text-secondary'
                      }`} title={member.user.display_name}>{member.user.username}</span>
                    </div>
                    
                    {hasPick && !picksArePrivate && memberPick?.teams && (
                      <Badge variant="secondary" className="text-xs px-2 py-0.5">
                        {memberPick.teams.key}
                      </Badge>
                    )}
                    
                    {hasPick && picksArePrivate && (
                      <Badge variant="outline" className="text-xs px-2 py-0.5">
                        Picked
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Commissioner Controls */}
          {canRevealPicks && picksArePrivate && (
            <Alert className="mt-4 border-blue-600 bg-blue-900/20">
              <Eye className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-300 flex items-center justify-between">
                <div>
                  <strong>Commissioner Control:</strong> You can reveal picks now to allow new members to join up to game time.
                </div>
                <Button
                  onClick={handleRevealPicks}
                  disabled={revealingPicks}
                  size="sm"
                  className="ml-4 bg-blue-600 hover:bg-blue-700"
                >
                  {revealingPicks ? 'Revealing...' : `Reveal Week ${week} Picks`}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Status for Non-Commissioners */}
          {!canRevealPicks && picksArePrivate && (
            <Alert className="mt-4">
              <EyeOff className="h-4 w-4" />
              <AlertDescription>
                Picks are hidden until the commissioner reveals them. {membersWithoutPicks.length > 0 && `Waiting for ${membersWithoutPicks.length} more pick(s).`}
              </AlertDescription>
            </Alert>
          )}

          {picksManuallyRevealed && (
            <Alert className="mt-4 border-green-600 bg-green-900/20">
              <Eye className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-300">
                <strong>Picks Revealed!</strong> The commissioner has revealed all picks for Week {week}. New members can still join!
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {currentPick && (
        <Card className="bg-primary/5 border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-primary text-base">
              <Star className="h-4 w-4" />
              Your Week {week} Pick
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center gap-3">
              {currentPick.teams?.key && (
                <Image 
                  src={getTeamHelmet(currentPick.teams.key)} 
                  alt={`${currentPick.teams.name} helmet`}
                  width={48}
                  height={48}
                  className="rounded-lg"
                />
              )}
              <div>
                <div className="font-semibold text-lg">
                  {currentPick.teams?.city} {currentPick.teams?.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {currentPick.teams?.key} • Submitted for Week {week}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}


      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Week {week} - Make Your Pick
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            🚫 <strong>Survivor Rule:</strong> Each team can only be used once per season • 🔒 = Already used in previous week • Betting lines help inform your decision
          </p>
        </CardHeader>
        <CardContent className="pt-2">
          {/* Lock Status Legend */}
          {availableGames.some(game => {
            const now = new Date()
            const gameTime = new Date(game.game_time)
            return gameTime <= now
          }) && (
            <Alert className="mb-4 border-orange-600 bg-orange-900/20">
              <Lock className="h-4 w-4 text-orange-400" />
              <AlertDescription className="text-orange-300">
                <strong>Game Locked:</strong> Games that have started or finished are locked and cannot be picked.
                You can only pick teams whose games haven&apos;t started yet.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-2 sm:gap-3">
            {availableGames.map(game => {
              const homeAvailable = !usedTeamIds.includes(game.home_team_id)
              const awayAvailable = !usedTeamIds.includes(game.away_team_id)
              const homeSpread = getSpreadDisplay(game, game.home_team_id)
              const awaySpread = getSpreadDisplay(game, game.away_team_id)
              const gameCompleted = game.is_final === true
              const homeWon = gameCompleted && (game.home_score ?? 0) > (game.away_score ?? 0)
              const awayWon = gameCompleted && (game.away_score ?? 0) > (game.home_score ?? 0)

              // Check if game has started (either in progress or completed)
              const now = new Date()
              const gameTime = new Date(game.game_time)
              const gameStarted = gameTime <= now
              const gameInProgress = gameStarted && !gameCompleted

              return (
                <Card key={game.id} className={`overflow-hidden ${gameStarted ? 'opacity-95' : ''}`}>
                  <div className="p-3 space-y-2">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      {gameCompleted ? (
                        <>
                          <Badge variant="secondary" className="text-xs">FINAL</Badge>
                          <span className="font-semibold">
                            {game.away_team.key} {game.away_score} - {game.home_team.key} {game.home_score}
                          </span>
                        </>
                      ) : gameInProgress ? (
                        <>
                          <Badge variant="default" className="text-xs bg-red-600">IN PROGRESS</Badge>
                          <span className="font-semibold">
                            {game.away_team.key} {game.away_score ?? 0} - {game.home_team.key} {game.home_score ?? 0}
                          </span>
                          {game.game_status && <span className="text-xs">• {game.game_status}</span>}
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3" />
                          {getGameTime(game.game_time)}
                        </>
                      )}
                    </div>

                    {/* Betting Line Information or Game Outcome Analysis */}
                    {(() => {
                      const gameKey = `${game.away_team.key}@${game.home_team.key}`
                      const line = gameLines?.[gameKey]
                      
                      if (gameCompleted && line) {
                        const analysis = getGameOutcomeAnalysis(game, line)
                        if (analysis) {
                          const bgColor = analysis.isUpset 
                            ? analysis.upsetSize === 'MAJOR' || analysis.upsetSize === 'BIG'
                              ? 'bg-orange-500/20 border-orange-400/50'
                              : 'bg-yellow-500/20 border-yellow-400/50'
                            : analysis.covered
                            ? 'bg-green-500/20 border-green-400/50'
                            : 'bg-blue-500/20 border-blue-400/50'
                          
                          const iconColor = analysis.isUpset 
                            ? 'text-orange-400'
                            : analysis.covered 
                            ? 'text-green-400'
                            : 'text-blue-400'
                          
                          const label = analysis.isUpset 
                            ? 'UPSET ALERT' 
                            : analysis.covered 
                            ? 'SPREAD COVERED'
                            : 'GAME RESULT'
                          
                          return (
                            <div className={`${bgColor} rounded-lg p-2 text-center`}>
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Target className={`h-3 w-3 ${iconColor}`} />
                                <span className={`text-xs font-medium ${iconColor}`}>{label}</span>
                              </div>
                              <p className="text-xs sm:text-sm font-medium leading-tight text-foreground">{analysis.message}</p>
                              {line.overUnder && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Total: {line.overUnder} pts • Actual: {(game.home_score ?? 0) + (game.away_score ?? 0)} pts
                                </div>
                              )}
                            </div>
                          )
                        }
                      } else if (!gameCompleted && line) {
                        const naturalLanguage = formatSpreadToNaturalLanguage(game.home_team, game.away_team, line)
                        const confidence = getSpreadConfidenceIndicator(line.spread)
                        return (
                          <div className="bg-primary/10 border border-primary/30 rounded-lg p-2 text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <Target className="h-3 w-3 text-primary" />
                              <span className="text-xs font-medium text-primary">BETTING LINE</span>
                            </div>
                            <p className="text-xs sm:text-sm font-medium leading-tight">{naturalLanguage}</p>
                            <div className="flex items-center justify-center gap-2 mt-1">
                              <span className={`text-xs ${confidence.color}`}>
                                {confidence.description}
                              </span>
                              {line.overUnder && (
                                <span className="text-xs text-muted-foreground">
                                  • Total: {line.overUnder} pts
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      }
                      return null
                    })()}

                    {/* Team Matchup - Horizontal Layout */}
                    <div className="flex items-center gap-2 sm:gap-4">
                      {/* Away Team */}
                      <button
                        onClick={() => awayAvailable && !gameStarted && handleTeamSelect(game.away_team_id, game.id)}
                        disabled={!awayAvailable || !!currentPick || gameStarted}
                        title={
                          gameInProgress ? 'Game is in progress - picks are locked' :
                          gameCompleted ? 'Game has already been played' :
                          !awayAvailable ? `${game.away_team.city} ${game.away_team.name} was already used in a previous week` :
                          `Select ${game.away_team.city} ${game.away_team.name}`
                        }
                        className={`flex-1 p-3 sm:p-4 rounded-lg border transition-all min-h-[100px] sm:min-h-[120px] relative ${
                          gameStarted
                            ? awayWon
                              ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/15 cursor-not-allowed'
                              : gameInProgress
                              ? 'bg-orange-500/10 border-orange-500/30 cursor-not-allowed opacity-75'
                              : 'bg-muted/50 border-border cursor-not-allowed'
                            : !awayAvailable
                            ? 'opacity-50 cursor-not-allowed bg-muted border-red-300'
                            : selectedTeamId === game.away_team_id
                            ? 'border-primary bg-primary/10 ring-2 ring-primary'
                            : 'hover:bg-accent cursor-pointer'
                        }`}
                      >
                        {!awayAvailable && !gameStarted && (
                          <div className="absolute inset-0 bg-red-500/20 rounded-lg flex items-center justify-center">
                            <div className="bg-red-600 text-white rounded-full p-2">
                              <Lock className="h-4 w-4" />
                            </div>
                          </div>
                        )}
                        {gameInProgress && (
                          <div className="absolute inset-0 bg-orange-500/20 rounded-lg flex items-center justify-center">
                            <div className="bg-orange-600 text-white rounded-full p-2">
                              <Lock className="h-4 w-4" />
                            </div>
                          </div>
                        )}
                        {gameCompleted && awayWon && (
                          <div className="absolute top-2 right-2 bg-green-600 text-white rounded-full p-1">
                            <CustomIcon name="trophy" fallback="🏆" alt="Winner" size="sm" />
                          </div>
                        )}
                        <div className="flex flex-col items-center text-center space-y-2">
                          <Image
                            src={getTeamHelmet(game.away_team.key)}
                            alt={game.away_team.name}
                            width={48}
                            height={48}
                            className="sm:w-16 sm:h-16"
                          />
                          <div>
                            <p className="font-medium text-sm sm:text-base">{game.away_team.city}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">{game.away_team.name}</p>
                            {gameCompleted && (
                              <p className={`text-lg font-bold ${awayWon ? 'text-green-600' : 'text-red-500'}`}>
                                {game.away_score}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <Badge variant="secondary" className="text-xs px-2 py-1">
                              <CustomIcon name="away" fallback="✈️" alt="Away team" size="sm" />
                              <span className="ml-1">Away</span>
                            </Badge>
                            {gameCompleted && (
                              <Badge 
                                variant={awayWon ? "default" : "secondary"} 
                                className={`text-xs px-2 py-1 font-bold ${
                                  awayWon ? 'bg-green-600 text-white' : 'bg-red-500 text-white'
                                }`}
                              >
                                {awayWon ? "WINNER" : "LOSER"}
                              </Badge>
                            )}
                            {!gameCompleted && awaySpread && (
                              <Badge 
                                variant={awaySpread.type === 'favorite' ? 'default' : 'outline'}
                                className={`text-xs px-2 py-1 ${awaySpread.type === 'favorite' ? 'bg-green-600' : ''}`}
                              >
                                {awaySpread.type === 'favorite' && <TrendingUp className="h-3 w-3 mr-1" />}
                                {awaySpread.type === 'underdog' && <TrendingDown className="h-3 w-3 mr-1" />}
                                {awaySpread.text}
                              </Badge>
                            )}
                            {!awayAvailable && !gameCompleted && (
                              <Badge variant="destructive" className="text-xs px-2 py-1 flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                Already Used
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>

                      {/* VS Divider */}
                      <div className="flex flex-col items-center px-1 sm:px-2">
                        <div className="text-lg sm:text-xl font-bold text-muted-foreground">VS</div>
                        <div className="text-xs text-muted-foreground hidden sm:block">@</div>
                      </div>

                      {/* Home Team */}
                      <button
                        onClick={() => homeAvailable && !gameStarted && handleTeamSelect(game.home_team_id, game.id)}
                        disabled={!homeAvailable || !!currentPick || gameStarted}
                        title={
                          gameInProgress ? 'Game is in progress - picks are locked' :
                          gameCompleted ? 'Game has already been played' :
                          !homeAvailable ? `${game.home_team.city} ${game.home_team.name} was already used in a previous week` :
                          `Select ${game.home_team.city} ${game.home_team.name}`
                        }
                        className={`flex-1 p-3 sm:p-4 rounded-lg border transition-all min-h-[100px] sm:min-h-[120px] relative ${
                          gameStarted
                            ? homeWon
                              ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/15 cursor-not-allowed'
                              : gameInProgress
                              ? 'bg-orange-500/10 border-orange-500/30 cursor-not-allowed opacity-75'
                              : 'bg-muted/50 border-border cursor-not-allowed'
                            : !homeAvailable
                            ? 'opacity-50 cursor-not-allowed bg-muted border-red-300'
                            : selectedTeamId === game.home_team_id
                            ? 'border-primary bg-primary/10 ring-2 ring-primary'
                            : 'hover:bg-accent cursor-pointer'
                        }`}
                      >
                        {!homeAvailable && !gameStarted && (
                          <div className="absolute inset-0 bg-red-500/20 rounded-lg flex items-center justify-center">
                            <div className="bg-red-600 text-white rounded-full p-2">
                              <Lock className="h-4 w-4" />
                            </div>
                          </div>
                        )}
                        {gameInProgress && (
                          <div className="absolute inset-0 bg-orange-500/20 rounded-lg flex items-center justify-center">
                            <div className="bg-orange-600 text-white rounded-full p-2">
                              <Lock className="h-4 w-4" />
                            </div>
                          </div>
                        )}
                        {gameCompleted && homeWon && (
                          <div className="absolute top-2 right-2 bg-green-600 text-white rounded-full p-1">
                            <CustomIcon name="trophy" fallback="🏆" alt="Winner" size="sm" />
                          </div>
                        )}
                        <div className="flex flex-col items-center text-center space-y-2">
                          <Image
                            src={getTeamHelmet(game.home_team.key)}
                            alt={game.home_team.name}
                            width={48}
                            height={48}
                            className="sm:w-16 sm:h-16"
                          />
                          <div>
                            <p className="font-medium text-sm sm:text-base">{game.home_team.city}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">{game.home_team.name}</p>
                            {gameCompleted && (
                              <p className={`text-lg font-bold ${homeWon ? 'text-green-600' : 'text-red-500'}`}>
                                {game.home_score}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <Badge variant="default" className="text-xs bg-blue-600 px-2 py-1">
                              <CustomIcon name="home" fallback="🏠" alt="Home team" size="sm" />
                              <span className="ml-1">Home</span>
                            </Badge>
                            {gameCompleted && (
                              <Badge 
                                variant={homeWon ? "default" : "secondary"} 
                                className={`text-xs px-2 py-1 font-bold ${
                                  homeWon ? 'bg-green-600 text-white' : 'bg-red-500 text-white'
                                }`}
                              >
                                {homeWon ? "WINNER" : "LOSER"}
                              </Badge>
                            )}
                            {!gameCompleted && homeSpread && (
                              <Badge 
                                variant={homeSpread.type === 'favorite' ? 'default' : 'outline'}
                                className={`text-xs px-2 py-1 ${homeSpread.type === 'favorite' ? 'bg-green-600' : ''}`}
                              >
                                {homeSpread.type === 'favorite' && <TrendingUp className="h-3 w-3 mr-1" />}
                                {homeSpread.type === 'underdog' && <TrendingDown className="h-3 w-3 mr-1" />}
                                {homeSpread.text}
                              </Badge>
                            )}
                            {!homeAvailable && !gameCompleted && (
                              <Badge variant="destructive" className="text-xs px-2 py-1 flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                Already Used
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Bye Week Teams */}
          {byeWeekTeams.length > 0 && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Teams on Bye Week {week}:</strong> {byeWeekTeams.join(', ')}
              </AlertDescription>
            </Alert>
          )}

          {/* Desktop Submit Button - Removed as we'll use sticky footer for all */}
        </CardContent>
      </Card>

      {/* Sticky Submit Footer - Shows on all screen sizes when team is selected */}
      {selectedTeamId && !currentPick && selectedTeam && (
        <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-gradient-to-t from-background via-background to-background/95 backdrop-blur-sm border-t-2 border-primary/50">
            <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4">
              <div className="flex items-center justify-between gap-4">
                {/* Selected Team Info */}
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 border-2 border-primary">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Your selection:</p>
                    <p className="text-base sm:text-lg font-bold text-primary flex items-center gap-1">
                      {selectedTeam.city} {selectedTeam.name}
                      <span className="text-xs sm:text-sm font-normal text-muted-foreground">({selectedTeam.key})</span>
                    </p>
                  </div>
                </div>
                
                {/* Lock Button */}
                <Button 
                  onClick={handleSubmit}
                  size="lg"
                  className="min-w-[140px] sm:min-w-[180px] h-12 sm:h-14 bg-primary hover:bg-primary-hover text-primary-foreground font-bold shadow-lg hover:shadow-xl transition-all group"
                >
                  <Lock className="h-4 w-4 sm:h-5 sm:w-5 mr-2 group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline">Lock Pick: </span>
                  <span className="font-bold">{selectedTeam.key}</span>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
              
              {/* Warning/Info */}
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="h-3 w-3" />
                <span>This action cannot be undone. Make sure you&apos;re confident in your pick!</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}