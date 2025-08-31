'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WeekCountdown } from '@/components/WeekCountdown'
import { Clock, Tv, Home, Plane, TrendingUp, TrendingDown } from 'lucide-react'
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

interface FutureWeekScheduleProps {
  week: number
  games: Game[]
  gameLines?: Record<string, { 
    spread: number
    homeTeam: string
    awayTeam: string
    overUnder?: number
  }>
  byeWeekTeams?: string[]
}

export function FutureWeekSchedule({ 
  week, 
  games, 
  gameLines,
  byeWeekTeams = []
}: FutureWeekScheduleProps) {
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

  const getGameTime = (dateString: string) => {
    const date = new Date(dateString)
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' })
    const time = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      timeZoneName: 'short'
    })
    return { dayOfWeek, time, fullDate: date }
  }

  const isPrimetime = (date: Date) => {
    const day = date.getDay()
    const hour = date.getHours()
    
    // Thursday Night Football
    if (day === 4 && hour >= 20) return 'TNF'
    // Sunday Night Football
    if (day === 0 && hour >= 20) return 'SNF'
    // Monday Night Football
    if (day === 1 && hour >= 20) return 'MNF'
    
    return null
  }

  // Group games by day
  const gamesByDay = games.reduce((acc, game) => {
    const { dayOfWeek, fullDate } = getGameTime(game.game_time)
    const dateKey = fullDate.toDateString()
    if (!acc[dateKey]) {
      acc[dateKey] = {
        dayOfWeek,
        date: fullDate,
        games: []
      }
    }
    acc[dateKey].games.push(game)
    return acc
  }, {} as Record<string, { dayOfWeek: string, date: Date, games: Game[] }>)

  const sortedDays = Object.keys(gamesByDay).sort((a, b) => 
    gamesByDay[a].date.getTime() - gamesByDay[b].date.getTime()
  )

  return (
    <div className="space-y-6">
      {/* Countdown Timer */}
      <WeekCountdown week={week} />
      
      <Card>
        <CardHeader>
          <CardTitle>Week {week} Schedule</CardTitle>
          <p className="text-sm text-muted-foreground">
            All matchups and current betting lines
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {sortedDays.map(dateKey => {
            const dayData = gamesByDay[dateKey]
            return (
              <div key={dateKey}>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  {dayData.dayOfWeek}, {dayData.date.toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dayData.games.map(game => {
                    const gameKey = `${game.away_team.key}@${game.home_team.key}`
                    const line = gameLines?.[gameKey]
                    const { time } = getGameTime(game.game_time)
                    const primetimeGame = isPrimetime(new Date(game.game_time))
                    
                    return (
                      <Card key={game.id} className={primetimeGame ? 'border-primary' : ''}>
                        <CardContent className="p-4">
                          {primetimeGame && (
                            <Badge className="mb-2 bg-primary text-black">
                              <Tv className="h-3 w-3 mr-1" />
                              {primetimeGame}
                            </Badge>
                          )}
                          
                          <div className="space-y-3">
                            {/* Away Team */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Image
                                  src={getTeamHelmet(game.away_team.key)}
                                  alt={game.away_team.name}
                                  width={36}
                                  height={36}
                                />
                                <div>
                                  <p className="font-medium">{game.away_team.city}</p>
                                  <p className="text-sm text-muted-foreground">{game.away_team.name}</p>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                <Plane className="h-3 w-3 mr-1" />
                                Away
                              </Badge>
                            </div>

                            <div className="text-center text-sm text-muted-foreground">@</div>

                            {/* Home Team */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Image
                                  src={getTeamHelmet(game.home_team.key)}
                                  alt={game.home_team.name}
                                  width={36}
                                  height={36}
                                />
                                <div>
                                  <p className="font-medium">{game.home_team.city}</p>
                                  <p className="text-sm text-muted-foreground">{game.home_team.name}</p>
                                </div>
                              </div>
                              <Badge variant="default" className="text-xs bg-blue-600">
                                <Home className="h-3 w-3 mr-1" />
                                Home
                              </Badge>
                            </div>

                            {/* Game Info */}
                            <div className="pt-3 border-t space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {time}
                                </span>
                                {line && (
                                  <div className="flex items-center gap-2">
                                    <Badge variant={line.spread < 0 ? "default" : "outline"} className="text-xs">
                                      {line.spread < 0 ? (
                                        <>
                                          <TrendingUp className="h-3 w-3 mr-1" />
                                          {game.home_team.key} -{Math.abs(line.spread)}
                                        </>
                                      ) : line.spread > 0 ? (
                                        <>
                                          <TrendingDown className="h-3 w-3 mr-1" />
                                          {game.away_team.key} -{line.spread}
                                        </>
                                      ) : (
                                        'PICK'
                                      )}
                                    </Badge>
                                    {line.overUnder && (
                                      <Badge variant="secondary" className="text-xs">
                                        O/U {line.overUnder}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Bye Week Teams */}
          {byeWeekTeams.length > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <h4 className="font-medium mb-2">Teams on Bye Week</h4>
                <div className="flex flex-wrap gap-2">
                  {byeWeekTeams.map(teamKey => (
                    <Badge key={teamKey} variant="secondary">
                      {teamKey}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )
}