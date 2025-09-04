'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Calendar, Clock, Info } from 'lucide-react'
import Image from 'next/image'

interface Team {
  team_id: number
  key: string
  city: string
  name: string
}

interface Game {
  id: string
  week: number
  season_year: number
  home_team_id: number
  away_team_id: number
  home_team: Team
  away_team: Team
  game_time: string
  home_score?: number
  away_score?: number
  is_final: boolean
}

interface BettingLine {
  homeTeam: string
  awayTeam: string
  spread: number
  overUnder: number
  homeMoneyLine: number
  awayMoneyLine: number
}

export default function SchedulePage() {
  const params = useParams()
  const slug = params.slug as string
  const [loading, setLoading] = useState(true)
  const [games, setGames] = useState<Game[]>([])
  const [currentWeek, setCurrentWeek] = useState(1)
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [lines, setLines] = useState<Record<string, BettingLine>>({})
  const [leagueName, setLeagueName] = useState('')
  const [timezone, setTimezone] = useState('America/New_York')
  
  const supabase = createClient()

  // Get user's timezone
  useEffect(() => {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    setTimezone(userTimezone)
  }, [])

  // Calculate current NFL week
  useEffect(() => {
    const calculateCurrentWeek = () => {
      const seasonStart = new Date('2025-09-04T00:00:00Z') // 2025 NFL season start
      const now = new Date()
      const weeksPassed = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
      const week = Math.max(1, Math.min(18, weeksPassed + 1))
      setCurrentWeek(week)
      setSelectedWeek(week)
    }
    calculateCurrentWeek()
  }, [])

  // Load league info and games
  useEffect(() => {
    const loadSchedule = async () => {
      setLoading(true)
      
      // Get league info
      const { data: league } = await supabase
        .from('leagues')
        .select('name')
        .eq('slug', slug)
        .single()
      
      if (league) {
        setLeagueName(league.name)
      }

      // Get games for selected week
      const { data: gamesData } = await supabase
        .from('games')
        .select(`
          *,
          home_team:teams!games_home_team_id_fkey(team_id, key, city, name),
          away_team:teams!games_away_team_id_fkey(team_id, key, city, name)
        `)
        .eq('week', selectedWeek)
        .eq('season_year', 2025)
        .order('game_time', { ascending: true })

      if (gamesData) {
        setGames(gamesData as Game[])
      }

      // Fetch betting lines
      try {
        const response = await fetch(`/api/betting-lines?week=${selectedWeek}&season=2025`)
        const data = await response.json()
        if (data.success && data.lines) {
          setLines(data.lines)
        }
      } catch (error) {
        console.error('Error fetching betting lines:', error)
      }

      setLoading(false)
    }

    loadSchedule()
  }, [selectedWeek, slug, supabase])

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

  const formatGameTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    
    // Check if game has started
    const hasStarted = date <= now
    
    // Format for display in user's timezone
    const formatted = date.toLocaleString('en-US', {
      timeZone: timezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    })
    
    return { formatted, hasStarted, date }
  }

  const getSpreadDisplay = (line: BettingLine | undefined) => {
    if (!line) return null
    
    if (line.spread === 0) {
      return { text: "Pick'em", color: 'text-yellow-600' }
    } else if (line.spread < 0) {
      return { 
        home: { text: `${line.spread}`, color: 'text-green-600' },
        away: { text: `+${Math.abs(line.spread)}`, color: 'text-gray-600' }
      }
    } else {
      return {
        home: { text: `+${line.spread}`, color: 'text-gray-600' },
        away: { text: `-${line.spread}`, color: 'text-green-600' }
      }
    }
  }

  // Group games by day
  const gamesByDay = games.reduce((acc, game) => {
    const { formatted } = formatGameTime(game.game_time)
    const day = formatted.split(',')[0] + ',' + formatted.split(',')[1]
    if (!acc[day]) acc[day] = []
    acc[day].push(game)
    return acc
  }, {} as Record<string, Game[]>)

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = `/league/${slug}`}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to League
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{leagueName} Schedule</h1>
              <p className="text-muted-foreground">Week {selectedWeek} • 2025 Season</p>
            </div>
          </div>
        </div>

        {/* Week Selector */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Select Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 sm:grid-cols-9 lg:grid-cols-18 gap-2">
              {Array.from({ length: 18 }, (_, i) => i + 1).map(week => (
                <Button
                  key={week}
                  variant={selectedWeek === week ? 'default' : week === currentWeek ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedWeek(week)}
                  className="w-full"
                >
                  {week}
                  {week === currentWeek && (
                    <Badge className="ml-1 text-xs" variant="secondary">Now</Badge>
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Timezone Display */}
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            All times shown in your local timezone: <strong>{timezone}</strong>
          </AlertDescription>
        </Alert>

        {/* Games Schedule */}
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              Loading schedule...
            </CardContent>
          </Card>
        ) : games.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              No games scheduled for Week {selectedWeek}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(gamesByDay).map(([day, dayGames]) => (
              <div key={day}>
                <h2 className="text-lg font-semibold mb-3 text-primary">{day}</h2>
                <div className="grid gap-3">
                  {dayGames.map(game => {
                    const gameKey = `${game.away_team.key}@${game.home_team.key}`
                    const line = lines[gameKey]
                    const { formatted, hasStarted } = formatGameTime(game.game_time)
                    const timeOnly = formatted.split(',').slice(-1)[0].trim()
                    const spreadDisplay = getSpreadDisplay(line)
                    
                    return (
                      <Card key={game.id} className={hasStarted ? 'opacity-75' : ''}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-4">
                            {/* Game Time */}
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{timeOnly}</div>
                                {hasStarted && (
                                  <Badge variant="secondary" className="text-xs">Started</Badge>
                                )}
                              </div>
                            </div>

                            {/* Teams */}
                            <div className="flex-1 flex items-center justify-center gap-4">
                              {/* Away Team */}
                              <div className="flex items-center gap-2 flex-1 justify-end">
                                <span className="text-sm font-medium">{game.away_team.city} {game.away_team.name}</span>
                                <Image
                                  src={getTeamHelmet(game.away_team.key)}
                                  alt={game.away_team.name}
                                  width={40}
                                  height={40}
                                />
                              </div>

                              <div className="text-lg font-bold text-muted-foreground">@</div>

                              {/* Home Team */}
                              <div className="flex items-center gap-2 flex-1">
                                <Image
                                  src={getTeamHelmet(game.home_team.key)}
                                  alt={game.home_team.name}
                                  width={40}
                                  height={40}
                                />
                                <span className="text-sm font-medium">{game.home_team.city} {game.home_team.name}</span>
                              </div>
                            </div>

                            {/* Betting Lines */}
                            {line && (
                              <div className="min-w-[200px] text-right">
                                <div className="space-y-1">
                                  {spreadDisplay && (
                                    <div className="flex items-center justify-end gap-2">
                                      <span className="text-sm text-muted-foreground">Spread:</span>
                                      {spreadDisplay.text ? (
                                        <Badge variant="outline" className={spreadDisplay.color}>
                                          {spreadDisplay.text}
                                        </Badge>
                                      ) : spreadDisplay.home ? (
                                        <>
                                          <span className={`text-sm font-medium ${spreadDisplay.home.color}`}>
                                            {game.home_team.key} {spreadDisplay.home.text}
                                          </span>
                                        </>
                                      ) : null}
                                    </div>
                                  )}
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="text-sm text-muted-foreground">O/U:</span>
                                    <span className="text-sm font-medium">{line.overUnder}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}