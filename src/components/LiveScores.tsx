'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Zap } from 'lucide-react'

interface Game {
  id: string
  week: number
  season_year: number
  game_time: string
  home_team: {
    key: string
    name: string
    location: string
  }
  away_team: {
    key: string
    name: string
    location: string
  }
  home_score: number | null
  away_score: number | null
  is_final: boolean
  game_status?: string
  last_updated?: string
}

interface LiveScoresProps {
  week: number
  className?: string
}

interface RawGameData {
  id: string
  week: number
  season_year: number
  game_time: string
  home_team: {
    key: string
    name: string
    location: string
  } | {
    key: string
    name: string
    location: string
  }[]
  away_team: {
    key: string
    name: string
    location: string
  } | {
    key: string
    name: string
    location: string
  }[]
  home_score: number | null
  away_score: number | null
  is_final: boolean
  game_status?: string
  last_updated?: string
}

export default function LiveScores({ week, className = '' }: LiveScoresProps) {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const supabase = createClient()

  const fetchGames = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select(`
          id,
          week,
          season_year,
          game_time,
          home_score,
          away_score,
          is_final,
          game_status,
          last_updated,
          home_team:teams!games_home_team_id_fkey(key, name, location),
          away_team:teams!games_away_team_id_fkey(key, name, location)
        `)
        .eq('week', week)
        .eq('season_year', 2024)
        .order('game_time')

      if (error) {
        console.error('Error fetching games:', error)
        return
      }

      console.log(`LiveScores: Found ${data?.length || 0} games for week ${week}, season 2024`)

      // Transform the data to match our interface
      const transformedGames = (data || []).map((game: RawGameData): Game => ({
        ...game,
        home_team: Array.isArray(game.home_team) ? game.home_team[0] : game.home_team,
        away_team: Array.isArray(game.away_team) ? game.away_team[0] : game.away_team
      }))
      
      setGames(transformedGames)
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Error fetching games:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [week, supabase])

  const refreshScores = async () => {
    setRefreshing(true)
    try {
      // Call the sync API endpoint
      const response = await fetch('/api/admin/sync-live-scores', {
        method: 'POST'
      })
      
      if (response.ok) {
        // Wait a moment then refresh the games
        setTimeout(fetchGames, 1000)
      }
    } catch (error) {
      console.error('Error syncing scores:', error)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchGames()
    
    // Set up real-time subscription for game updates
    const subscription = supabase
      .channel('live-scores')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `week=eq.${week}`
      }, () => {
        fetchGames()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [week, fetchGames, supabase])

  const getGameStatus = (game: Game) => {
    if (game.is_final) return 'FINAL'
    if (game.game_status) return game.game_status
    
    const gameTime = new Date(game.game_time)
    const now = new Date()
    
    if (now < gameTime) {
      return gameTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
    
    return 'LIVE'
  }

  const getStatusColor = (game: Game) => {
    if (game.is_final) return 'bg-gray-500'
    if (game.game_status?.includes('LIVE') || game.game_status?.includes('PROGRESS')) return 'bg-green-500'
    return 'bg-blue-500'
  }

  const getLiveGames = () => games.filter(g => !g.is_final && (g.home_score || g.away_score))
  const getCompletedGames = () => games.filter(g => g.is_final)
  const getUpcomingGames = () => games.filter(g => !g.is_final && !g.home_score && !g.away_score)

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Live Scores - Week {week}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">Loading scores...</div>
        </CardContent>
      </Card>
    )
  }

  const liveGames = getLiveGames()
  const completedGames = getCompletedGames()
  const upcomingGames = getUpcomingGames()

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Live Scores - Week {week}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshScores}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        {lastRefresh && (
          <p className="text-sm text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Live Games */}
        {liveGames.length > 0 && (
          <div>
            <h4 className="font-medium text-green-600 mb-2">🔴 Live Games</h4>
            <div className="space-y-2">
              {liveGames.map((game) => (
                <div key={game.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{game.away_team.key} @ {game.home_team.key}</span>
                      <Badge className={getStatusColor(game)}>
                        {getGameStatus(game)}
                      </Badge>
                    </div>
                    <div className="text-lg font-bold mt-1">
                      {game.away_score || 0} - {game.home_score || 0}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Games */}
        {completedGames.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-600 mb-2">✅ Final Scores</h4>
            <div className="space-y-2">
              {completedGames.map((game) => (
                <div key={game.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{game.away_team.key} @ {game.home_team.key}</span>
                      <Badge className="bg-gray-500">FINAL</Badge>
                    </div>
                    <div className="text-lg font-bold mt-1">
                      {game.away_score || 0} - {game.home_score || 0}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Games */}
        {upcomingGames.length > 0 && (
          <div>
            <h4 className="font-medium text-blue-600 mb-2">📅 Upcoming Games</h4>
            <div className="space-y-2">
              {upcomingGames.map((game) => (
                <div key={game.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{game.away_team.key} @ {game.home_team.key}</span>
                      <Badge className="bg-blue-500">
                        {getGameStatus(game)}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {new Date(game.game_time).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {games.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No games found for Week {week}
          </div>
        )}
      </CardContent>
    </Card>
  )
}