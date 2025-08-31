'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CustomIcon } from '@/components/ui/custom-icon'
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
  home_score?: number | null
  away_score?: number | null
  home_team_id: number
  away_team_id: number
}

interface Pick {
  id: string
  user_id: string
  team_id: number
  is_correct?: boolean | null
  team?: Team
  user?: User
  users?: User
}

interface User {
  id: string
  username: string
  display_name: string
}

interface Member {
  user: User
  lives_remaining: number
  is_eliminated: boolean
  eliminated_week?: number
}

interface PastWeekResultsProps {
  week: number
  games: Game[]
  picks: (Pick & { user: User })[]
  members: Member[]
  gameLines?: Record<string, { spread: number, homeTeam: string, awayTeam: string }>
}

export function PastWeekResults({ week, games, picks, members, gameLines }: PastWeekResultsProps) {
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

  const isUpset = (game: Game, winningTeamId: number) => {
    const gameKey = `${game.away_team.key}@${game.home_team.key}`
    const line = gameLines?.[gameKey]
    if (!line) return false
    
    // If home team won and was underdog (positive spread), it's an upset
    if (winningTeamId === game.home_team_id && line.spread > 0) return true
    // If away team won and was underdog (negative spread means home favored)
    if (winningTeamId === game.away_team_id && line.spread < 0) return true
    
    return false
  }

  const getWinner = (game: Game) => {
    if (game.home_score == null || game.away_score == null) return null
    return game.home_score > game.away_score ? game.home_team_id : game.away_team_id
  }

  return (
    <div className="space-y-6">
      {/* Player Results */}
      <Card>
        <CardHeader>
          <CardTitle>Week {week} Player Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {picks.map(pick => {
              const member = members.find(m => m.user?.id === pick.user_id)
              const wasEliminated = member?.eliminated_week === week

              return (
                <div key={pick.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Image
                        src={getTeamHelmet(pick.team?.key || '')}
                        alt={pick.team?.name || ''}
                        width={40}
                        height={40}
                        className="rounded"
                      />
                    </div>
                    <div>
                      <p className="font-medium" title={pick.user?.display_name || pick.users?.display_name}>{pick.user?.username || pick.users?.username || 'Unknown Player'}</p>
                      <p className="text-sm text-muted-foreground">{pick.team?.key}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {member && (
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
                    )}
                    {pick.is_correct === true && (
                      <Badge variant="default" className="bg-green-600">
                        <CustomIcon name="checkmark" fallback="✅" alt="Correct pick" size="sm" />
                        <span className="ml-1">Won</span>
                      </Badge>
                    )}
                    {pick.is_correct === false && !wasEliminated && (
                      <Badge variant="destructive">
                        <CustomIcon name="x-wrong" fallback="❌" alt="Wrong pick" size="sm" />
                        <span className="ml-1">Lost</span>
                      </Badge>
                    )}
                    {wasEliminated && (
                      <Badge variant="destructive">
                        <CustomIcon name="skull" fallback="💀" alt="Eliminated" size="sm" />
                        <span className="ml-1">Eliminated</span>
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* NFL Results */}
      <Card>
        <CardHeader>
          <CardTitle>Week {week} NFL Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {games.map(game => {
              const winner = getWinner(game)
              const wasUpset = winner && isUpset(game, winner)
              
              return (
                <div key={game.id} className="p-4 bg-background rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Image
                        src={getTeamHelmet(game.away_team.key)}
                        alt={game.away_team.name}
                        width={32}
                        height={32}
                      />
                      <span className={winner === game.away_team_id ? 'font-bold' : ''}>
                        {game.away_team.key}
                      </span>
                      <span className="text-xl font-mono">
                        {game.away_score ?? '-'}
                      </span>
                    </div>
                    {wasUpset && (
                      <Badge variant="destructive" className="animate-pulse">
                        🔥 UPSET
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Image
                      src={getTeamHelmet(game.home_team.key)}
                      alt={game.home_team.name}
                      width={32}
                      height={32}
                    />
                    <span className={winner === game.home_team_id ? 'font-bold' : ''}>
                      {game.home_team.key}
                    </span>
                    <span className="text-xl font-mono">
                      {game.home_score ?? '-'}
                    </span>
                    <Badge variant="outline" className="ml-2">
                      🏠
                    </Badge>
                  </div>

                  {gameLines?.[`${game.away_team.key}@${game.home_team.key}`] && (
                    <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                      Line: {game.home_team.key} {gameLines[`${game.away_team.key}@${game.home_team.key}`].spread > 0 ? '+' : ''}
                      {gameLines[`${game.away_team.key}@${game.home_team.key}`].spread}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}