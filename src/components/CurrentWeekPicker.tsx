'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CustomIcon } from '@/components/ui/custom-icon'
import { WeekCountdown } from '@/components/WeekCountdown'
import { formatSpreadToNaturalLanguage, getSpreadConfidenceIndicator } from '@/lib/utils/betting-lines'
import { Star, Clock, AlertTriangle, TrendingUp, TrendingDown, Users, Target } from 'lucide-react'
import Image from 'next/image'

interface Team {
  team_id: number
  key: string
  city: string
  name: string
  full_name: string
}

interface Game {
  id: string
  home_team: Team
  away_team: Team
  game_time: string
  home_team_id: number
  away_team_id: number
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
  team?: Team
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
  currentPick?: { team_id: number, team?: Team }
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
  onPickSubmit 
}: CurrentWeekPickerProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(currentPick?.team_id || null)
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)

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
  
  // Check if all active members have submitted picks
  const allPicksSubmitted = membersWithoutPicks.length === 0
  
  // Determine if picks should be private (not all submitted yet)
  const picksArePrivate = !allPicksSubmitted

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
    <div className={`space-y-6 ${selectedTeamId && !currentPick ? 'pb-20 sm:pb-0' : ''}`}>
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
                    
                    {hasPick && !picksArePrivate && memberPick?.team && (
                      <Badge variant="secondary" className="text-xs px-2 py-0.5">
                        {memberPick.team.key}
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

          {!allPicksSubmitted && (
            <Alert className="mt-4">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Waiting for {membersWithoutPicks.length} more pick(s). All picks will be revealed once everyone has submitted.
              </AlertDescription>
            </Alert>
          )}

          {allPicksSubmitted && (
            <Alert className="mt-4 bg-primary/10 border-primary/50">
              <CustomIcon name="checkmark" fallback="✅" alt="Complete" size="sm" className="inline" />
              <AlertDescription className="text-primary">
                All picks are in! You can now see everyone&apos;s selections below.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {currentPick && (
        <Alert className="bg-primary/10 border-primary">
          <Star className="h-4 w-4" />
          <AlertDescription>
            You&apos;ve already picked <strong>{currentPick.team?.name}</strong> for Week {week}
          </AlertDescription>
        </Alert>
      )}


      <Card>
        <CardHeader>
          <CardTitle>
            Week {week} - Make Your Pick
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Select from available teams (grayed out = already used) • Betting lines help inform your decision
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {availableGames.map(game => {
              const homeAvailable = !usedTeamIds.includes(game.home_team_id)
              const awayAvailable = !usedTeamIds.includes(game.away_team_id)
              const homeSpread = getSpreadDisplay(game, game.home_team_id)
              const awaySpread = getSpreadDisplay(game, game.away_team_id)

              return (
                <Card key={game.id} className="overflow-hidden">
                  <div className="p-3 space-y-2">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {getGameTime(game.game_time)}
                    </div>

                    {/* Betting Line Information */}
                    {(() => {
                      const gameKey = `${game.away_team.key}@${game.home_team.key}`
                      const line = gameLines?.[gameKey]
                      if (line) {
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

                    {/* Away Team */}
                    <button
                      onClick={() => awayAvailable && handleTeamSelect(game.away_team_id, game.id)}
                      disabled={!awayAvailable || !!currentPick}
                      className={`w-full p-2 rounded-lg border transition-all min-h-[60px] ${
                        !awayAvailable 
                          ? 'opacity-50 cursor-not-allowed bg-muted' 
                          : selectedTeamId === game.away_team_id
                          ? 'border-primary bg-primary/10 ring-2 ring-primary'
                          : 'hover:bg-accent cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Image
                            src={getTeamHelmet(game.away_team.key)}
                            alt={game.away_team.name}
                            width={32}
                            height={32}
                          />
                          <div className="text-left">
                            <p className="font-medium text-sm">{game.away_team.city}</p>
                            <p className="text-xs text-muted-foreground">{game.away_team.name}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="secondary" className="text-xs px-2 py-0.5">
                            <CustomIcon name="away" fallback="✈️" alt="Away team" size="sm" />
                            <span className="ml-1">Away</span>
                          </Badge>
                          {awaySpread && (
                            <Badge 
                              variant={awaySpread.type === 'favorite' ? 'default' : 'outline'}
                              className={`text-xs px-2 py-0.5 ${awaySpread.type === 'favorite' ? 'bg-green-600' : ''}`}
                            >
                              {awaySpread.type === 'favorite' && <TrendingUp className="h-3 w-3 mr-1" />}
                              {awaySpread.type === 'underdog' && <TrendingDown className="h-3 w-3 mr-1" />}
                              {awaySpread.text}
                            </Badge>
                          )}
                          {!awayAvailable && (
                            <Badge variant="destructive" className="text-xs px-2 py-0.5">
                              Already Used
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>

                    <div className="text-center text-xs text-muted-foreground">vs</div>

                    {/* Home Team */}
                    <button
                      onClick={() => homeAvailable && handleTeamSelect(game.home_team_id, game.id)}
                      disabled={!homeAvailable || !!currentPick}
                      className={`w-full p-2 rounded-lg border transition-all min-h-[60px] ${
                        !homeAvailable 
                          ? 'opacity-50 cursor-not-allowed bg-muted' 
                          : selectedTeamId === game.home_team_id
                          ? 'border-primary bg-primary/10 ring-2 ring-primary'
                          : 'hover:bg-accent cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Image
                            src={getTeamHelmet(game.home_team.key)}
                            alt={game.home_team.name}
                            width={32}
                            height={32}
                          />
                          <div className="text-left">
                            <p className="font-medium text-sm">{game.home_team.city}</p>
                            <p className="text-xs text-muted-foreground">{game.home_team.name}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="default" className="text-xs bg-blue-600 px-2 py-0.5">
                            <CustomIcon name="home" fallback="🏠" alt="Home team" size="sm" />
                            <span className="ml-1">Home</span>
                          </Badge>
                          {homeSpread && (
                            <Badge 
                              variant={homeSpread.type === 'favorite' ? 'default' : 'outline'}
                              className={`text-xs px-2 py-0.5 ${homeSpread.type === 'favorite' ? 'bg-green-600' : ''}`}
                            >
                              {homeSpread.type === 'favorite' && <TrendingUp className="h-3 w-3 mr-1" />}
                              {homeSpread.type === 'underdog' && <TrendingDown className="h-3 w-3 mr-1" />}
                              {homeSpread.text}
                            </Badge>
                          )}
                          {!homeAvailable && (
                            <Badge variant="destructive" className="text-xs px-2 py-0.5">
                              Already Used
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
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

          {/* Submit Button - Desktop */}
          {selectedTeamId && !currentPick && (
            <div className="hidden sm:flex mt-4 justify-center">
              <Button 
                onClick={handleSubmit}
                size="lg"
                className="sm:min-w-[200px] min-h-[48px]"
              >
                Lock In Pick
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sticky Submit Button - Mobile Only */}
      {selectedTeamId && !currentPick && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-50">
          <Button 
            onClick={handleSubmit}
            size="lg"
            className="w-full min-h-[48px] bg-primary hover:bg-primary-hover"
          >
            Lock In Pick
          </Button>
        </div>
      )}
    </div>
  )
}