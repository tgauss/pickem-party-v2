'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Shield, AlertTriangle, Settings, ExternalLink, Users, Heart } from 'lucide-react'

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
  is_paid: boolean
}

interface Game {
  id: string
  home_team: {
    team_id: number
    key: string
    city: string
    name: string
  }
  away_team: {
    team_id: number
    key: string
    city: string
    name: string
  }
  game_time: string
  is_final?: boolean
}

interface AdminControlWidgetProps {
  currentUser: User
  league: {
    id: string
    name: string
    slug: string
    invite_code: string
    commissioner_id?: string
  }
  members: Member[]
  membersWithoutPicks: Member[]
  games: Game[]
  usedTeamIds: number[]
  onAdminPickSubmit?: (userId: string, teamId: number, gameId: string) => void
  children?: React.ReactNode
}

// Simple admin check (matches API authorization)
function isUserAdmin(user: User, league: { commissioner_id?: string }): boolean {
  const superAdminUsernames = ['admin', 'tgauss', 'pickemking']
  const isSuperAdmin = superAdminUsernames.includes(user.username.toLowerCase())
  const isCommissioner = league.commissioner_id === user.id
  
  return isSuperAdmin || isCommissioner
}

export function AdminControlWidget({
  currentUser,
  league,
  members,
  membersWithoutPicks,
  games,
  usedTeamIds,
  onAdminPickSubmit,
  children
}: AdminControlWidgetProps) {
  const [adminPickingFor, setAdminPickingFor] = useState<string | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  
  const isAdmin = isUserAdmin(currentUser, league)
  
  if (!isAdmin) {
    return null // Don't render anything for non-admin users
  }

  return (
    <Card className="border-red-600 bg-red-900/10 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-red-400">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <span>Admin Controls</span>
            <div className="text-xs bg-red-600 text-white px-2 py-1 rounded">
              ADMIN ONLY
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <Alert className="border-yellow-600 bg-yellow-900/20">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-yellow-300">
              <strong>Admin Mode:</strong> You have elevated permissions in this league.
            </AlertDescription>
          </Alert>

          {/* Quick Admin Dashboard Access */}
          <div className="border border-blue-600 bg-blue-900/20 rounded-lg p-4">
            <h3 className="text-blue-400 font-medium mb-3 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Admin Dashboard
            </h3>
            
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm mb-4">
                <div className="text-blue-300 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{members.filter(m => !m.is_eliminated).length} Active Players</span>
                </div>
                <div className="text-blue-300 flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  <span>{members.reduce((sum, m) => sum + m.lives_remaining, 0)} Total Lives</span>
                </div>
                <div className="text-blue-300">
                  <span>{members.filter(m => m.is_eliminated).length} Eliminated</span>
                </div>
              </div>

              <Button 
                onClick={() => window.location.href = `/league/${league.slug}/admin`}
                variant="default"
                className="w-full bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open Full Admin Dashboard
              </Button>
              
              <p className="text-xs text-blue-300">
                Manage player lives, view activity logs, resurrect players, and more.
              </p>
            </div>
          </div>

          {/* Quick Pick Override for Current Week */}
          {membersWithoutPicks.length > 0 && (
            <div className="border border-orange-600 bg-orange-900/20 rounded-lg p-4">
              <h3 className="text-orange-400 font-medium mb-3 flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Quick Pick Override
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-orange-300">Set pick for player:</label>
                  <Select value={adminPickingFor || ''} onValueChange={setAdminPickingFor}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choose a player who hasn't picked..." />
                    </SelectTrigger>
                    <SelectContent>
                      {membersWithoutPicks.map(member => (
                        <SelectItem key={member.user.id} value={member.user.id}>
                          {member.user.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {adminPickingFor && (
                  <>
                    <Alert className="border-orange-600 bg-orange-900/30">
                      <AlertTriangle className="h-4 w-4 text-orange-400" />
                      <AlertDescription className="text-orange-300">
                        Setting pick for <strong className="text-orange-100">
                          {membersWithoutPicks.find(m => m.user.id === adminPickingFor)?.user.display_name}
                        </strong>. Select a team below to complete their pick.
                      </AlertDescription>
                    </Alert>

                    {/* Team Selection */}
                    <div className="space-y-3 mt-4">
                      <label className="text-sm font-medium text-orange-300">Select team:</label>
                      <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                        {games
                          .filter(game => !game.is_final)
                          .map(game => {
                            const homeAvailable = !usedTeamIds.includes(game.home_team.team_id)
                            const awayAvailable = !usedTeamIds.includes(game.away_team.team_id)

                            if (!homeAvailable && !awayAvailable) return null

                            return (
                              <div key={game.id} className="border border-orange-600/30 rounded-lg p-3">
                                <div className="text-xs text-orange-300 mb-2">
                                  {new Date(game.game_time).toLocaleString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit'
                                  })}
                                </div>
                                <div className="flex gap-2">
                                  {awayAvailable && (
                                    <Button
                                      variant={selectedTeamId === game.away_team.team_id ? "default" : "outline"}
                                      size="sm"
                                      className="flex-1 text-xs"
                                      onClick={() => {
                                        setSelectedTeamId(game.away_team.team_id)
                                        setSelectedGameId(game.id)
                                      }}
                                    >
                                      {game.away_team.key} (Away)
                                    </Button>
                                  )}
                                  {homeAvailable && (
                                    <Button
                                      variant={selectedTeamId === game.home_team.team_id ? "default" : "outline"}
                                      size="sm"
                                      className="flex-1 text-xs"
                                      onClick={() => {
                                        setSelectedTeamId(game.home_team.team_id)
                                        setSelectedGameId(game.id)
                                      }}
                                    >
                                      {game.home_team.key} (Home)
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )
                          })
                        }
                      </div>

                      {selectedTeamId && selectedGameId && (
                        <Button
                          onClick={async () => {
                            if (onAdminPickSubmit && adminPickingFor && selectedTeamId && selectedGameId) {
                              await onAdminPickSubmit(adminPickingFor, selectedTeamId, selectedGameId)
                              // Reset state after successful submission
                              setAdminPickingFor(null)
                              setSelectedTeamId(null)
                              setSelectedGameId(null)
                            }
                          }}
                          className="w-full bg-orange-600 hover:bg-orange-700"
                        >
                          Set Pick for {membersWithoutPicks.find(m => m.user.id === adminPickingFor)?.user.display_name}
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Render children if provided */}
      {children}
    </Card>
  )
}