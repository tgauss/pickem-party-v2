'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface EliminatedPlayer {
  user_id: string
  user: {
    display_name: string
    username: string
  }
  lives_remaining: number
  eliminated_week: number
  is_eliminated: boolean
}

interface ResurrectPlayersProps {
  leagueId: string
  onResurrect: () => void
}

export function ResurrectPlayers({ leagueId, onResurrect }: ResurrectPlayersProps) {
  const [eliminatedPlayers, setEliminatedPlayers] = useState<EliminatedPlayer[]>([])
  const [resurrectingId, setResurrectingId] = useState<string | null>(null)
  const supabase = createClient()

  const loadEliminatedPlayers = useCallback(async () => {
    const { data } = await supabase
      .from('league_members')
      .select(`
        *,
        user:users(display_name, username)
      `)
      .eq('league_id', leagueId)
      .eq('is_eliminated', true)
    
    setEliminatedPlayers(data || [])
  }, [leagueId, supabase])

  useEffect(() => {
    loadEliminatedPlayers()
  }, [loadEliminatedPlayers])

  const resurrectPlayer = async (userId: string) => {
    setResurrectingId(userId)
    
    try {
      // Get current user for the adjustment
      const currentUser = localStorage.getItem('currentUser')
      if (!currentUser) {
        alert('❌ You must be logged in to resurrect players')
        setResurrectingId(null)
        return
      }
      
      const userData = JSON.parse(currentUser)
      
      // Use the new life adjustment API
      const response = await fetch('/api/admin/adjust-lives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId: leagueId,
          targetUserId: userId,
          adjustmentAmount: 2, // Give them 2 lives (from 0 to 2)
          reason: 'Player resurrection',
          notes: 'Brought back to life by admin',
          adjustedBy: userData.id
        })
      })

      const data = await response.json()
      if (data.success) {
        alert('✅ Player resurrected successfully!')
        await loadEliminatedPlayers()
        onResurrect()
      } else {
        alert(`❌ Resurrection failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Resurrection error:', error)
      alert('❌ Network error during resurrection')
    }
    
    setResurrectingId(null)
  }

  if (eliminatedPlayers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>💚 No eliminated players to resurrect</p>
        <p className="text-sm">All fighters are still alive!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {eliminatedPlayers.map(player => (
        <div key={player.user_id} className="flex justify-between items-center p-3 bg-background rounded-lg border">
          <div>
            <p className="font-bold">{player.user.display_name}</p>
            <p className="text-sm text-muted-foreground">@{player.user.username}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="destructive">ELIMINATED</Badge>
              <span className="text-xs text-muted-foreground">
                Week {player.eliminated_week}
              </span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => resurrectPlayer(player.user_id)}
            disabled={resurrectingId === player.user_id}
            className="fight-text"
            style={{
              backgroundColor: 'var(--success)',
              color: 'var(--background)'
            }}
          >
            {resurrectingId === player.user_id ? '...' : '🔥 RESURRECT'}
          </Button>
        </div>
      ))}
    </div>
  )
}