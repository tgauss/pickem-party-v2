'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'

interface Team {
  team_id: number
  key: string
  city: string
  name: string
  full_name: string
  primary_color: string
  secondary_color: string
  logo_url: string
  conference: string
  division: string
}

interface Game {
  id: string
  week: number
  home_team: Team
  away_team: Team
  game_time: string
}

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
}

interface Member {
  user: User
  lives_remaining: number
  is_eliminated: boolean
  is_paid: boolean
}

interface Pick {
  id: string
  teams: Team
}

export default function LeaguePage({ params }: { params: { slug: string } }) {
  const [user, setUser] = useState<User | null>(null)
  const [league, setLeague] = useState<League | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [userPick, setUserPick] = useState<Pick | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const loadLeagueData = async (userId: string, slug: string) => {
    // Load league
    const { data: leagueData } = await supabase
      .from('leagues')
      .select('*')
      .eq('slug', slug)
      .single()
    
    if (!leagueData) {
      alert('League not found!')
      window.location.href = '/dashboard'
      return
    }
    
    setLeague(leagueData)
    
    // Load teams
    const { data: teamsData } = await supabase
      .from('teams')
      .select('*')
      .order('conference', { ascending: true })
      .order('division', { ascending: true })
    
    setTeams(teamsData || [])
    
    // Load Week 1 games with team data
    const { data: gamesData } = await supabase
      .from('games')
      .select(`
        *,
        home_team:teams!games_home_team_id_fkey(*),
        away_team:teams!games_away_team_id_fkey(*)
      `)
      .eq('week', 1)
      .eq('season_year', 2025)
    
    setGames(gamesData || [])
    
    // Load league members
    const { data: membersData } = await supabase
      .from('league_members')
      .select(`
        *,
        users(*)
      `)
      .eq('league_id', leagueData.id)
    
    setMembers(membersData?.map((m: any) => ({
      user: m.users as User,
      lives_remaining: m.lives_remaining,
      is_eliminated: m.is_eliminated,
      is_paid: m.is_paid
    })) || [])
    
    // Load user's current pick
    const { data: pickData } = await supabase
      .from('picks')
      .select('*, teams(*)')
      .eq('user_id', userId)
      .eq('league_id', leagueData.id)
      .eq('week', 1)
      .single()
    
    if (pickData) {
      setUserPick(pickData)
      setSelectedTeam(pickData.teams)
    }
  }

  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser')
    if (!currentUser) {
      window.location.href = '/'
      return
    }
    
    const userData = JSON.parse(currentUser)
    setUser(userData)
    loadLeagueData(userData.id, params.slug)
  }, [params.slug])

  const submitPick = async () => {
    if (!user || !league || !selectedTeam) {
      alert('Please select a team first!')
      return
    }
    
    // Check if deadline has passed (basic validation)
    const now = new Date()
    const firstGame = games.find(g => new Date(g.game_time) <= now)
    if (firstGame) {
      alert('⏰ DEADLINE PASSED! Week 1 picks are locked.')
      return
    }
    
    setLoading(true)
    
    // Find the game this team is playing
    const game = games.find(g => 
      g.home_team.team_id === selectedTeam.team_id || 
      g.away_team.team_id === selectedTeam.team_id
    )
    
    if (!game) {
      alert('Game not found for selected team!')
      setLoading(false)
      return
    }
    
    if (userPick) {
      // Update existing pick
      const { error } = await supabase
        .from('picks')
        .update({
          team_id: selectedTeam.team_id,
          game_id: game.id
        })
        .eq('id', userPick.id)
      
      if (error) {
        alert('Failed to update pick: ' + error.message)
      } else {
        alert('PICK UPDATED! ⚔️')
        await loadLeagueData(user.id, params.slug)
      }
    } else {
      // Create new pick
      const { error } = await supabase
        .from('picks')
        .insert({
          user_id: user.id,
          league_id: league.id,
          game_id: game.id,
          team_id: selectedTeam.team_id,
          week: 1
        })
      
      if (error) {
        alert('Failed to submit pick: ' + error.message)
      } else {
        alert('PICK SUBMITTED! ⚔️')
        await loadLeagueData(user.id, params.slug)
      }
    }
    setLoading(false)
  }

  if (!user || !league) return <div className="p-4">Loading arena...</div>

  // Find opponent for selected team
  const selectedGame = selectedTeam ? games.find(g => 
    g.home_team.team_id === selectedTeam.team_id || 
    g.away_team.team_id === selectedTeam.team_id
  ) : null
  
  const opponent = selectedGame ? (
    selectedGame.home_team.team_id === selectedTeam?.team_id 
      ? selectedGame.away_team 
      : selectedGame.home_team
  ) : null

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 fight-text" style={{color: 'var(--primary)'}}>
            {league.name.toUpperCase()}
          </h1>
          <p className="text-muted-foreground">
            WEEK 1 • {members.filter(m => !m.is_eliminated).length} FIGHTERS REMAIN
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Invite Code: <strong>{league.invite_code}</strong>
          </p>
        </div>

        {/* Current Pick Status */}
        {userPick && (
          <Card className="mb-6 p-6 retro-border">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-4 fight-text" style={{color: 'var(--secondary)'}}>
                {user.display_name.toUpperCase()} VS {opponent?.city.toUpperCase()} {opponent?.name.toUpperCase()}
              </h2>
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="text-center">
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-2"
                    style={{backgroundColor: `#${selectedTeam?.primary_color}`}}
                  >
                    <span className="text-white font-bold fight-text">
                      {user.display_name[0]}
                    </span>
                  </div>
                  <p className="text-sm font-bold">YOU</p>
                  <p className="text-xs text-muted-foreground">({selectedTeam?.key})</p>
                </div>
                <div className="text-2xl font-bold fight-text">VS</div>
                <div className="text-center">
                  {opponent && (
                    <>
                      <Image
                        src={opponent.logo_url}
                        alt={opponent.full_name}
                        width={64}
                        height={64}
                        className="mx-auto mb-2"
                      />
                      <p className="text-sm font-bold">{opponent.city}</p>
                      <p className="text-xs text-muted-foreground">({opponent.key})</p>
                    </>
                  )}
                </div>
              </div>
              <Badge 
                className="fight-text"
                style={{backgroundColor: 'var(--warning)', color: 'var(--background)'}}
              >
                PICK LOCKED IN
              </Badge>
            </div>
          </Card>
        )}

        {/* Team Selection */}
        {!userPick && (
          <Card className="mb-6 p-6 retro-border">
            <h2 className="text-xl font-bold mb-4 fight-text text-center">
              CHOOSE YOUR FIGHTER - WEEK 1
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {teams.map(team => (
                <div
                  key={team.team_id}
                  onClick={() => setSelectedTeam(team)}
                  className={`p-3 rounded-lg cursor-pointer transition-all border-2 min-h-[80px] ${
                    selectedTeam?.team_id === team.team_id
                      ? 'border-primary bg-selected-bg'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                  style={{
                    backgroundColor: selectedTeam?.team_id === team.team_id 
                      ? `rgba(${parseInt(team.primary_color.slice(0,2), 16)}, ${parseInt(team.primary_color.slice(2,4), 16)}, ${parseInt(team.primary_color.slice(4,6), 16)}, 0.1)`
                      : undefined
                  }}
                >
                  <div className="text-center">
                    <Image
                      src={team.logo_url}
                      alt={team.full_name}
                      width={40}
                      height={40}
                      className="mx-auto mb-2"
                    />
                    <p className="text-sm font-bold">{team.city}</p>
                    <p className="text-xs text-muted-foreground">{team.key}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {selectedTeam && (
              <div className="mt-6 text-center">
                <p className="text-lg font-bold mb-4 fight-text">
                  {user.display_name.toUpperCase()} VS {opponent?.city.toUpperCase()} {opponent?.name.toUpperCase()}
                </p>
                <Button 
                  onClick={submitPick}
                  disabled={loading}
                  className="fight-text px-8"
                  style={{backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)'}}
                >
                  {loading ? '...' : 'LOCK IN PICK! ⚔️'}
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Standings */}
        <Card className="p-6 retro-border">
          <h2 className="text-xl font-bold mb-4 fight-text">FIGHTER STANDINGS</h2>
          <div className="space-y-3">
            {members.map((member, index) => (
              <div 
                key={member.user.id}
                className={`flex justify-between items-center p-3 rounded-lg ${
                  member.is_eliminated ? 'opacity-50' : ''
                }`}
                style={{
                  backgroundColor: member.is_eliminated ? 'var(--muted)' : 'var(--surface)'
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold fight-text">#{index + 1}</span>
                  <div>
                    <p className="font-bold">{member.user.display_name}</p>
                    <p className="text-xs text-muted-foreground">@{member.user.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={member.is_paid ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {member.is_paid ? 'PAID' : 'UNPAID'}
                  </Badge>
                  <div className="flex">
                    {Array.from({ length: member.lives_remaining }, (_, i) => (
                      <span key={i} className="text-red-500">❤️</span>
                    ))}
                    {member.lives_remaining === 0 && (
                      <span className="text-destructive font-bold fight-text">K.O.</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="mt-6 text-center">
          <Button 
            onClick={() => window.location.href = '/dashboard'}
            variant="outline"
            className="fight-text"
          >
            ← BACK TO HQ
          </Button>
        </div>
      </div>
    </div>
  )
}