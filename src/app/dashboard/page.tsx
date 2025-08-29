'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
  const [showCreateLeague, setShowCreateLeague] = useState(false)
  const [showJoinLeague, setShowJoinLeague] = useState(false)
  const [leagueName, setLeagueName] = useState('')
  const [buyInAmount, setBuyInAmount] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser')
    if (!currentUser) {
      window.location.href = '/'
      return
    }
    
    const userData = JSON.parse(currentUser)
    setUser(userData)
    loadLeagues(userData.id)
  })

  const loadLeagues = async (userId: string) => {
    const { data } = await supabase
      .from('league_members')
      .select(`
        leagues(*)
      `)
      .eq('user_id', userId)
    
    setLeagues(data?.map(d => d.leagues).filter(Boolean) || [])
  }

  const createLeague = async () => {
    if (!user) return
    setLoading(true)
    
    const slug = leagueName.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    
    const { data: league, error } = await supabase
      .from('leagues')
      .insert({
        name: leagueName,
        slug: slug,
        buy_in_amount: parseFloat(buyInAmount) || 0,
        invite_code: code,
        commissioner_id: user.id,
        season_year: 2025
      })
      .select()
      .single()
    
    if (league) {
      // Add creator as member
      await supabase.from('league_members').insert({
        league_id: league.id,
        user_id: user.id,
        is_paid: true
      })
      
      await loadLeagues(user.id)
      setShowCreateLeague(false)
      setLeagueName('')
      setBuyInAmount('')
    } else {
      alert('League creation failed: ' + (error?.message || 'Unknown error'))
    }
    setLoading(false)
  }

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
          <h1 className="text-3xl font-bold mb-2 fight-text" style={{color: 'var(--primary)'}}>
            WELCOME, {user.display_name.toUpperCase()}!
          </h1>
          <p className="text-muted-foreground">READY FOR WEEK 1 BATTLE?</p>
        </div>

        {leagues.length === 0 ? (
          <Card className="p-6 retro-border text-center">
            <h2 className="text-xl font-bold mb-4 fight-text">NO ACTIVE LEAGUES</h2>
            <p className="text-muted-foreground mb-6">Create a league or join an existing one to start picking!</p>
            <div className="flex gap-4 justify-center">
              <Button 
                onClick={() => setShowCreateLeague(true)}
                className="fight-text"
                style={{backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)'}}
              >
                CREATE LEAGUE
              </Button>
              <Button 
                onClick={() => setShowJoinLeague(true)}
                variant="outline"
                className="fight-text"
              >
                JOIN LEAGUE
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold fight-text">YOUR LEAGUES</h2>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowCreateLeague(true)}
                  size="sm"
                  className="fight-text"
                  style={{backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)'}}
                >
                  CREATE
                </Button>
                <Button 
                  onClick={() => setShowJoinLeague(true)}
                  size="sm"
                  variant="outline"
                  className="fight-text"
                >
                  JOIN
                </Button>
              </div>
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

        {showCreateLeague && (
          <Card className="mt-6 p-6 retro-border">
            <h3 className="text-xl font-bold mb-4 fight-text">CREATE NEW LEAGUE</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="leagueName">League Name</Label>
                <Input
                  id="leagueName"
                  value={leagueName}
                  onChange={(e) => setLeagueName(e.target.value)}
                  className="bg-surface border-border"
                />
              </div>
              <div>
                <Label htmlFor="buyIn">Buy-in Amount</Label>
                <Input
                  id="buyIn"
                  type="number"
                  value={buyInAmount}
                  onChange={(e) => setBuyInAmount(e.target.value)}
                  className="bg-surface border-border"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={createLeague}
                  disabled={loading || !leagueName}
                  className="fight-text"
                  style={{backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)'}}
                >
                  {loading ? '...' : 'CREATE!'}
                </Button>
                <Button 
                  onClick={() => setShowCreateLeague(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
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
                  className="bg-surface border-border"
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