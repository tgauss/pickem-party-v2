'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ResurrectPlayers } from '@/components/admin/ResurrectPlayers'

interface League {
  id: string
  name: string
  slug: string
  invite_code: string
  buy_in_amount: number
  season_year: number
  commissioner: { display_name: string }
  member_count: number
}

interface User {
  id: string
  username: string
  display_name: string
  email: string
  created_at: string
}

interface Game {
  id: string
  week: number
  home_team: { team_id: number; key: string; city: string; name: string }
  away_team: { team_id: number; key: string; city: string; name: string }
  game_time: string
  home_score: number | null
  away_score: number | null
  is_final: boolean
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('leagues')
  const [leagues, setLeagues] = useState<League[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [newLeagueName, setNewLeagueName] = useState('')
  const [newLeagueBuyIn, setNewLeagueBuyIn] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [simulateLoading, setSimulateLoading] = useState(false)
  const [selectedLeague, setSelectedLeague] = useState('')
  const [selectedWeek, setSelectedWeek] = useState(1)
  const supabase = createClient()

  const loadData = useCallback(async () => {
    // Load leagues with member counts
    const { data: leagueData } = await supabase
      .from('leagues')
      .select(`
        *,
        commissioner:users!leagues_commissioner_id_fkey(display_name),
        league_members(count)
      `)
    
    setLeagues(leagueData?.map((l: League & { league_members: { count: number }[] }) => ({
      ...l,
      member_count: l.league_members?.[0]?.count || 0
    })) || [])

    // Load all users
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    
    setUsers(userData || [])

    // Load Week 1 games
    const { data: gameData } = await supabase
      .from('games')
      .select(`
        *,
        home_team:teams!games_home_team_id_fkey(*),
        away_team:teams!games_away_team_id_fkey(*)
      `)
      .eq('week', 1)
      .eq('season_year', 2025)
    
    setGames(gameData || [])
  }, [supabase])

  useEffect(() => {
    if (!localStorage.getItem('adminSession')) {
      window.location.href = '/admin'
      return
    }
    loadData()
  }, [loadData])

  const createLeague = async () => {
    if (!newLeagueName) return
    setLoading(true)
    
    const slug = newLeagueName.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    
    const { error } = await supabase
      .from('leagues')
      .insert({
        name: newLeagueName,
        slug: slug,
        buy_in_amount: parseFloat(newLeagueBuyIn) || 0,
        invite_code: code,
        commissioner_id: users[0]?.id, // Default to first user as commissioner
        season_year: 2025
      })
    
    if (!error) {
      setNewLeagueName('')
      setNewLeagueBuyIn('')
      loadData()
    }
    setLoading(false)
  }

  const importNFLSchedule = async () => {
    setImportLoading(true)
    try {
      const response = await fetch('/api/admin/import-schedule', {
        method: 'POST'
      })
      const result = await response.json()
      if (result.success) {
        alert(`✅ Imported ${result.imported} of ${result.total} games`)
        loadData()
      } else {
        alert('❌ Import failed: ' + result.error)
      }
    } catch {
      alert('❌ Import error')
    }
    setImportLoading(false)
  }

  const syncNFLScores = async () => {
    setSyncLoading(true)
    try {
      const response = await fetch('/api/admin/sync-scores', {
        method: 'POST'
      })
      const result = await response.json()
      if (result.success) {
        alert(`✅ Synced ${result.updated} games`)
        loadData()
      } else {
        alert('❌ Sync failed: ' + result.error)
      }
    } catch {
      alert('❌ Sync error')
    }
    setSyncLoading(false)
  }

  const createTestUsers = async () => {
    setSimulateLoading(true)
    try {
      const response = await fetch('/api/admin/create-test-users', {
        method: 'POST'
      })
      const result = await response.json()
      if (result.success) {
        alert(`✅ Created ${result.created} new users, ${result.existing} already existed`)
        loadData()
      } else {
        alert('❌ Failed to create test users: ' + result.error)
      }
    } catch {
      alert('❌ Test user creation error')
    }
    setSimulateLoading(false)
  }

  const import2024Results = async () => {
    setSimulateLoading(true)
    try {
      const response = await fetch('/api/admin/import-2024-results', {
        method: 'POST'
      })
      const result = await response.json()
      if (result.success) {
        alert(`✅ ${result.message}`)
        loadData()
      } else {
        alert('❌ Failed to import 2024 results: ' + result.error)
      }
    } catch {
      alert('❌ Import error')
    }
    setSimulateLoading(false)
  }

  const simulateWeeks = async (action: string) => {
    if (!selectedLeague) {
      alert('Please select a league first')
      return
    }
    
    setSimulateLoading(true)
    try {
      const response = await fetch('/api/admin/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          week: selectedWeek,
          leagueId: selectedLeague
        })
      })
      const result = await response.json()
      if (result.success) {
        alert(`✅ ${result.message}`)
        loadData()
      } else {
        alert('❌ Simulation failed: ' + result.error)
      }
    } catch {
      alert('❌ Simulation error')
    }
    setSimulateLoading(false)
  }

  const manualScoreUpdate = async (gameId: string, homeScore: number, awayScore: number) => {
    const { error } = await supabase
      .from('games')
      .update({
        home_score: homeScore,
        away_score: awayScore,
        is_final: true
      })
      .eq('id', gameId)
    
    if (!error) {
      alert('✅ Score updated!')
      loadData()
    }
  }


  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="mb-4">
            <Image 
              src="/logos/Pickem Part App Logo.svg" 
              alt="Pick'em Party Logo"
              width={64}
              height={64}
              className="mx-auto"
            />
          </div>
          <h1 className="text-3xl font-bold mb-2 fight-text" style={{color: 'var(--destructive)'}}>
            SUPER ADMIN COMMAND CENTER
          </h1>
          <p className="text-muted-foreground">Ultimate control over the arena</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 justify-center flex-wrap">
          {['leagues', 'users', 'games', 'resurrect', 'sync', 'simulate'].map(tab => (
            <Button
              key={tab}
              onClick={() => setActiveTab(tab)}
              variant={activeTab === tab ? 'default' : 'outline'}
              className="fight-text"
              style={activeTab === tab ? {
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)'
              } : {}}
            >
              {tab.toUpperCase()}
            </Button>
          ))}
        </div>

        {/* Leagues Tab */}
        {activeTab === 'leagues' && (
          <div className="space-y-6">
            <Card className="p-6 retro-border">
              <h2 className="text-xl font-bold mb-4 fight-text">CREATE NEW LEAGUE</h2>
              <div className="flex gap-4">
                <Input
                  placeholder="League name"
                  value={newLeagueName}
                  onChange={(e) => setNewLeagueName(e.target.value)}
                  className="bg-surface border-border min-h-[44px] text-base"
                />
                <Input
                  placeholder="Buy-in ($)"
                  type="number"
                  value={newLeagueBuyIn}
                  onChange={(e) => setNewLeagueBuyIn(e.target.value)}
                  className="bg-surface border-border min-h-[44px] text-base w-32"
                />
                <Button 
                  onClick={createLeague}
                  disabled={loading || !newLeagueName}
                  className="fight-text"
                  style={{backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)'}}
                >
                  {loading ? '...' : 'CREATE'}
                </Button>
              </div>
            </Card>

            <Card className="p-6 retro-border">
              <h2 className="text-xl font-bold mb-4 fight-text">ALL LEAGUES</h2>
              <div className="space-y-3">
                {leagues.map(league => (
                  <div key={league.id} className="flex justify-between items-center p-4 bg-surface rounded-lg">
                    <div>
                      <h3 className="font-bold">{league.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {league.member_count} members • ${league.buy_in_amount} • {league.invite_code}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Commissioner: {league.commissioner?.display_name}
                      </p>
                    </div>
                    <Button
                      onClick={() => window.location.href = `/league/${league.slug}`}
                      size="sm"
                      className="fight-text"
                      style={{backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)'}}
                    >
                      VIEW
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <Card className="p-6 retro-border">
            <h2 className="text-xl font-bold mb-4 fight-text">ALL FIGHTERS ({users.length})</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {users.map(user => (
                <div key={user.id} className="flex justify-between items-center p-3 bg-surface rounded-lg">
                  <div>
                    <p className="font-bold">{user.display_name}</p>
                    <p className="text-sm text-muted-foreground">@{user.username} • {user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined: {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline">ACTIVE</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Games Tab */}
        {activeTab === 'games' && (
          <Card className="p-6 retro-border">
            <h2 className="text-xl font-bold mb-4 fight-text">WEEK 1 GAMES</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {games.map(game => (
                <div key={game.id} className="p-4 bg-surface rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-bold">
                        {game.away_team?.key} @ {game.home_team?.key}
                      </span>
                      <Badge variant={game.is_final ? 'default' : 'secondary'}>
                        {game.is_final ? 'FINAL' : 'SCHEDULED'}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(game.game_time).toLocaleDateString()} {new Date(game.game_time).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Away"
                        defaultValue={game.away_score || ''}
                        className="w-20 bg-background"
                        id={`away-${game.id}`}
                      />
                      <span>-</span>
                      <Input
                        type="number"
                        placeholder="Home"
                        defaultValue={game.home_score || ''}
                        className="w-20 bg-background"
                        id={`home-${game.id}`}
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        const awayInput = document.getElementById(`away-${game.id}`) as HTMLInputElement
                        const homeInput = document.getElementById(`home-${game.id}`) as HTMLInputElement
                        manualScoreUpdate(game.id, parseInt(homeInput.value), parseInt(awayInput.value))
                      }}
                      className="fight-text"
                      style={{backgroundColor: 'var(--warning)', color: 'var(--background)'}}
                    >
                      UPDATE
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Resurrect Tab */}
        {activeTab === 'resurrect' && (
          <Card className="p-6 retro-border">
            <h2 className="text-xl font-bold mb-4 fight-text">RESURRECT ELIMINATED FIGHTERS</h2>
            <div className="space-y-4">
              {leagues.map(league => (
                <Card key={league.id} className="p-4">
                  <h3 className="font-bold mb-3">{league.name}</h3>
                  <ResurrectPlayers leagueId={league.id} onResurrect={loadData} />
                </Card>
              ))}
            </div>
          </Card>
        )}

        {/* Sync Tab */}
        {activeTab === 'sync' && (
          <div className="space-y-6">
            <Card className="p-6 retro-border">
              <h2 className="text-xl font-bold mb-4 fight-text">NFL DATA SYNC</h2>
              <div className="space-y-4">
                <Button 
                  onClick={importNFLSchedule}
                  disabled={importLoading}
                  className="w-full fight-text mb-4"
                  style={{backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)'}}
                >
                  {importLoading ? 'IMPORTING...' : '📅 IMPORT FULL NFL SCHEDULE'}
                </Button>

                <Button 
                  onClick={syncNFLScores}
                  disabled={syncLoading}
                  className="w-full fight-text"
                  style={{backgroundColor: 'var(--info)', color: 'var(--background)'}}
                >
                  {syncLoading ? 'SYNCING...' : '🔄 SYNC NFL SCORES'}
                </Button>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4">
                    <h3 className="font-bold mb-2">Total Users</h3>
                    <p className="text-2xl font-bold fight-text" style={{color: 'var(--primary)'}}>
                      {users.length}
                    </p>
                  </Card>
                  <Card className="p-4">
                    <h3 className="font-bold mb-2">Active Leagues</h3>
                    <p className="text-2xl font-bold fight-text" style={{color: 'var(--secondary)'}}>
                      {leagues.length}
                    </p>
                  </Card>
                  <Card className="p-4">
                    <h3 className="font-bold mb-2">Week 1 Games</h3>
                    <p className="text-2xl font-bold fight-text" style={{color: 'var(--info)'}}>
                      {games.length}
                    </p>
                  </Card>
                </div>
              </div>
            </Card>

            <Card className="p-6 retro-border">
              <h2 className="text-xl font-bold mb-4 fight-text">EMERGENCY CONTROLS</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="destructive"
                  className="w-full fight-text"
                  onClick={() => {
                    if (confirm('⚠️ Reset ALL Week 1 picks? This cannot be undone!')) {
                      supabase.from('picks').delete().eq('week', 1)
                        .then(() => alert('🔥 All Week 1 picks reset!'))
                    }
                  }}
                >
                  🗑️ RESET WEEK 1 PICKS
                </Button>
                <Button 
                  variant="destructive"
                  className="w-full fight-text"
                  onClick={() => {
                    if (confirm('⚠️ Mark all Week 1 games as final? This will trigger eliminations!')) {
                      supabase.from('games').update({ is_final: true }).eq('week', 1)
                        .then(() => alert('🏁 All Week 1 games marked final!'))
                    }
                  }}
                >
                  🏁 FINALIZE WEEK 1
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Simulate Tab */}
        {activeTab === 'simulate' && (
          <div className="space-y-6">
            <Card className="p-6 retro-border">
              <h2 className="text-xl font-bold mb-4 fight-text">🎮 TESTING SIMULATION CENTER</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    onClick={createTestUsers}
                    disabled={simulateLoading}
                    className="w-full fight-text"
                    style={{backgroundColor: 'var(--info)', color: 'var(--background)'}}
                  >
                    {simulateLoading ? 'CREATING...' : '👥 CREATE TEST USERS'}
                  </Button>
                  
                  <Button 
                    onClick={import2024Results}
                    disabled={simulateLoading}
                    className="w-full fight-text"
                    style={{backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)'}}
                  >
                    {simulateLoading ? 'IMPORTING...' : '📊 IMPORT 2024 RESULTS'}
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-bold mb-3">Simulation Controls</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Select League</label>
                      <select 
                        value={selectedLeague}
                        onChange={(e) => setSelectedLeague(e.target.value)}
                        className="w-full p-2 border rounded bg-surface border-border"
                      >
                        <option value="">Choose league...</option>
                        {leagues.map(league => (
                          <option key={league.id} value={league.id}>
                            {league.name} ({league.member_count} members)
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Target Week</label>
                      <select 
                        value={selectedWeek}
                        onChange={(e) => setSelectedWeek(Number(e.target.value))}
                        className="w-full p-2 border rounded bg-surface border-border"
                      >
                        {Array.from({length: 6}, (_, i) => (
                          <option key={i+1} value={i+1}>Week {i+1}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button 
                      onClick={() => simulateWeeks('generate-picks')}
                      disabled={simulateLoading || !selectedLeague}
                      className="w-full fight-text"
                      style={{backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)'}}
                    >
                      {simulateLoading ? '...' : '🎲 GENERATE PICKS'}
                    </Button>
                    
                    <Button 
                      onClick={() => simulateWeeks('process-week')}
                      disabled={simulateLoading || !selectedLeague}
                      className="w-full fight-text"
                      style={{backgroundColor: 'var(--warning)', color: 'var(--background)'}}
                    >
                      {simulateLoading ? '...' : '⚡ PROCESS WEEK'}
                    </Button>
                    
                    <Button 
                      onClick={() => simulateWeeks('simulate-weeks')}
                      disabled={simulateLoading || !selectedLeague}
                      className="w-full fight-text"
                      style={{backgroundColor: 'var(--success)', color: 'var(--background)'}}
                    >
                      {simulateLoading ? '...' : `🚀 SIMULATE TO WEEK ${selectedWeek}`}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 retro-border">
              <h2 className="text-xl font-bold mb-4 fight-text">📋 TEST USER CREDENTIALS</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {name: 'Jaren Petrusich', username: 'jaren', email: 'jlpetrusich@gmail.com'},
                  {name: 'Jordan Petrusich', username: 'jordan', email: 'jjpetrusich@gmail.com'},
                  {name: 'Brandon O\'Dore', username: 'brandon', email: 'brandonodore@gmail.com'},
                  {name: 'Hayden Gaussoin', username: 'hayden', email: 'haydeng4@gmail.com'},
                  {name: 'Dan Evans', username: 'dan', email: 'danevanspersonal@gmail.com'}
                ].map(user => (
                  <div key={user.username} className="p-3 bg-surface rounded-lg">
                    <p className="font-bold">{user.name}</p>
                    <p className="text-sm text-muted-foreground">Username: {user.username}</p>
                    <p className="text-sm text-muted-foreground">PIN: 1234</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        <div className="mt-8 text-center">
          <Button 
            onClick={() => {
              localStorage.removeItem('adminSession')
              window.location.href = '/'
            }}
            variant="outline"
            className="fight-text"
          >
            ← EXIT ADMIN
          </Button>
        </div>
      </div>
    </div>
  )
}