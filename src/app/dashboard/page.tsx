'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Image from 'next/image'

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
  buy_in_amount: number
  season_year: number
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [leagues, setLeagues] = useState<League[]>([])
  const [showJoinLeague, setShowJoinLeague] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const loadLeagues = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('league_members')
      .select(`
        leagues(*)
      `)
      .eq('user_id', userId)
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setLeagues(data?.map((d: any) => d.leagues).filter(Boolean) || [])
  }, [supabase])

  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser')
    if (!currentUser) {
      window.location.href = '/'
      return
    }
    
    const userData = JSON.parse(currentUser)
    setUser(userData)
    loadLeagues(userData.id)
  }, [loadLeagues])

  const joinLeague = async () => {
    if (!user) return
    setLoading(true)
    
    const { data: league } = await supabase
      .from('leagues')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase())
      .single()
    
    if (league) {
      const { error } = await supabase.from('league_members').insert({
        league_id: league.id,
        user_id: user.id
      })
      
      if (!error) {
        await loadLeagues(user.id)
        setShowJoinLeague(false)
        setInviteCode('')
      } else {
        alert('Failed to join: ' + error.message)
      }
    } else {
      alert('League not found!')
    }
    setLoading(false)
  }

  if (!user) return <div>Loading...</div>

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="mb-4">
            <Image 
              src="/logos/Pickem Part App Logo.svg" 
              alt="Pickem Party Logo"
              width={96}
              height={96}
              className="mx-auto"
            />
          </div>
          <h1 className="text-2xl font-bold mb-2 fight-text" style={{color: 'var(--primary)'}}>
            WELCOME, {user.display_name.toUpperCase()}!
          </h1>
          <p className="text-muted-foreground">READY FOR WEEK 1 BATTLE?</p>
        </div>

        {leagues.length === 0 ? (
          <Card className="p-6 retro-border text-center">
            <h2 className="text-xl font-bold mb-4 fight-text">NO ACTIVE LEAGUES</h2>
            <p className="text-muted-foreground mb-6">Join a league to start picking!</p>
            <div className="flex justify-center">
              <Button 
                onClick={() => setShowJoinLeague(true)}
                className="fight-text"
                style={{backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)'}}
              >
                JOIN LEAGUE
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold fight-text">YOUR LEAGUES</h2>
              <Button 
                onClick={() => setShowJoinLeague(true)}
                size="sm"
                className="fight-text"
                style={{backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)'}}
              >
                JOIN LEAGUE
              </Button>
            </div>
            
            {leagues.map(league => (
              <Card key={league.id} className="p-4 retro-border cursor-pointer hover:bg-selected-bg transition-colors">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg fight-text">{league.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Buy-in: ${league.buy_in_amount} • Code: {league.invite_code}
                    </p>
                  </div>
                  <Button
                    onClick={() => window.location.href = `/league/${league.slug}`}
                    className="fight-text"
                    style={{backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)'}}
                  >
                    FIGHT!
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}


        {showJoinLeague && (
          <Card className="mt-6 p-6 retro-border">
            <h3 className="text-xl font-bold mb-4 fight-text">JOIN LEAGUE</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="inviteCode">Invite Code</Label>
                <Input
                  id="inviteCode"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="6-character code"
                  maxLength={6}
                  className="bg-surface border-border min-h-[44px] text-base"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={joinLeague}
                  disabled={loading || inviteCode.length !== 6}
                  className="fight-text"
                  style={{backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)'}}
                >
                  {loading ? '...' : 'JOIN!'}
                </Button>
                <Button 
                  onClick={() => setShowJoinLeague(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}