'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { CustomIcon } from '@/components/ui/custom-icon'
import { Clock } from 'lucide-react'

interface WeekCountdownProps {
  week: number
  seasonYear?: number
  isPreSeason?: boolean
}

// Removed unused interface

export function WeekCountdown({ week, seasonYear = 2025, isPreSeason = false }: WeekCountdownProps) {
  const [firstGameTime, setFirstGameTime] = useState<Date | null>(null)
  const [countdown, setCountdown] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [deadlinePassed, setDeadlinePassed] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    const fetchFirstGameTime = async () => {
      try {
        // If week is 0 or preseason, show countdown to Week 1
        const targetWeek = week === 0 || isPreSeason ? 1 : week
        
        const { data: games } = await supabase
          .from('games')
          .select('game_time, home_team_id, away_team_id')
          .eq('week', targetWeek)
          .eq('season_year', seasonYear)
          .order('game_time', { ascending: true })
          .limit(1)

        if (games && games.length > 0) {
          const firstGame = new Date(games[0].game_time)
          setFirstGameTime(firstGame)
        }
      } catch (error) {
        console.error('Error fetching game times:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchFirstGameTime()
  }, [week, seasonYear, isPreSeason, supabase])

  useEffect(() => {
    if (!firstGameTime) return

    const updateCountdown = () => {
      const now = new Date()
      
      // Calculate deadline (1 hour before first game) - no timezone conversion needed
      // The game time is already stored as UTC in the database
      const deadline = new Date(firstGameTime.getTime() - (60 * 60 * 1000))
      
      const timeDiff = deadline.getTime() - now.getTime()
      
      if (timeDiff <= 0) {
        setDeadlinePassed(true)
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)

      setCountdown({ days, hours, minutes, seconds })
      setDeadlinePassed(false)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [firstGameTime])

  const formatGameTime = (date: Date) => {
    // Display in user's local timezone
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    })
  }

  if (loading) {
    return (
      <Card className="bg-surface border-primary/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-2">
            <Clock className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading game schedule...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!firstGameTime) {
    return (
      <Card className="bg-surface border-secondary/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-2">
            <CustomIcon name="calendar" fallback="📅" alt="No games" size="sm" />
            <span className="text-sm text-muted-foreground">
              No games scheduled for Week {week === 0 || isPreSeason ? '1' : week}
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (deadlinePassed) {
    return (
      <Card className="bg-primary/10 border-primary/50">
        <CardContent className="p-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CustomIcon name="target" fallback="🎯" alt="Still picking" size="sm" />
              <span className="font-bold text-primary">STILL PICKING!</span>
            </div>
            <p className="text-sm text-muted-foreground">
              You can still pick any team whose game hasn&apos;t started yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              First game started: {formatGameTime(firstGameTime)}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-primary/10 border-primary/50">
      <CardContent className="p-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <CustomIcon name="hourglass" fallback="⏰" alt="Countdown" size="sm" />
            <span className="font-bold text-primary">
              {week === 0 || isPreSeason ? 'SEASON STARTS' : 'PICK DEADLINE'}
            </span>
          </div>
          
          {countdown && (
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-primary font-['Press_Start_2P']">{countdown.days}</div>
                <div className="text-xs text-muted-foreground">DAYS</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-primary font-['Press_Start_2P']">{countdown.hours}</div>
                <div className="text-xs text-muted-foreground">HRS</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-primary font-['Press_Start_2P']">{countdown.minutes}</div>
                <div className="text-xs text-muted-foreground">MIN</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-primary font-['Press_Start_2P']">{countdown.seconds}</div>
                <div className="text-xs text-muted-foreground">SEC</div>
              </div>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            First game: {formatGameTime(firstGameTime)}
          </p>
          <p className="text-xs text-muted-foreground">
            (1 hour before kickoff)
          </p>
        </div>
      </CardContent>
    </Card>
  )
}