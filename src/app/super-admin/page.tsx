'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Shield, Users, Crown, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react'

interface User {
  id: string
  username: string
  display_name: string
  email: string
}

interface League {
  id: string
  name: string
  slug: string
  season_year: number
  commissioner_id?: string
  commissioner?: User
  member_count: number
}

// Super admin check (same hardcoded system)
function isSuperAdmin(username: string): boolean {
  const superAdminUsernames = ['admin', 'tgauss', 'pickemking']
  return superAdminUsernames.includes(username.toLowerCase())
}

export default function SuperAdminDashboard() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [leagues, setLeagues] = useState<League[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedLeague, setSelectedLeague] = useState<string>('')
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [assigning, setAssigning] = useState(false)

  const supabase = createClient()

  const checkSuperAdminAccess = useCallback(() => {
    const currentUser = localStorage.getItem('currentUser')
    if (!currentUser) {
      alert('Please log in to access admin dashboard')
      window.location.href = '/'
      return false
    }
    
    const userData = JSON.parse(currentUser)
    
    if (!isSuperAdmin(userData.username)) {
      alert('Access denied: Super admin privileges required')
      window.history.back()
      return false
    }
    
    setCurrentUser(userData)
    return true
  }, [])

  const loadData = useCallback(async () => {
    if (!currentUser) return
    
    setLoading(true)
    try {
      // Load all leagues with commissioner info and member counts
      const { data: leaguesData } = await supabase
        .from('leagues')
        .select(`
          *,
          commissioner:users!leagues_commissioner_id_fkey(id, username, display_name, email)
        `)
        .order('created_at', { ascending: false })

      // Get member counts for each league
      if (leaguesData) {
        const leaguesWithCounts = await Promise.all(
          leaguesData.map(async (league) => {
            const { count } = await supabase
              .from('league_members')
              .select('*', { count: 'exact', head: true })
              .eq('league_id', league.id)
            
            return {
              ...league,
              member_count: count || 0
            }
          })
        )
        setLeagues(leaguesWithCounts)
      }

      // Load all users for commissioner assignment
      const { data: usersData } = await supabase
        .from('users')
        .select('id, username, display_name, email')
        .order('display_name')
      
      setUsers(usersData || [])
    } catch (error) {
      console.error('Error loading admin data:', error)
    }
    setLoading(false)
  }, [currentUser, supabase])

  const assignCommissioner = async () => {
    if (!selectedLeague || !selectedUser || !currentUser) {
      alert('Please select both a league and a user')
      return
    }

    setAssigning(true)
    try {
      const response = await fetch('/api/admin/assign-commissioner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId: selectedLeague,
          newCommissionerId: selectedUser,
          assignedBy: currentUser.id
        })
      })

      const data = await response.json()
      if (data.success) {
        alert(`✅ ${data.message}`)
        setSelectedLeague('')
        setSelectedUser('')
        await loadData() // Refresh data
      } else {
        alert(`❌ ${data.error}`)
      }
    } catch (error) {
      console.error('Error assigning commissioner:', error)
      alert('❌ Network error assigning commissioner')
    }
    setAssigning(false)
  }

  useEffect(() => {
    if (checkSuperAdminAccess()) {
      // User is authorized, currentUser will be set
    }
  }, [checkSuperAdminAccess])

  useEffect(() => {
    if (currentUser) {
      loadData()
    }
  }, [currentUser, loadData])

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p>Checking super admin access...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/dashboard'}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{color: 'var(--primary)'}}>
              <Crown className="h-6 w-6" />
              Super Admin Dashboard
            </h1>
            <p className="text-muted-foreground">Manage commissioners across all leagues</p>
          </div>
        </div>

        <Alert className="mb-6 border-yellow-600 bg-yellow-900/20">
          <Shield className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-300">
            <strong>Super Admin Mode:</strong> You can assign commissioners to any league. 
            Only super admins ({['admin', 'tgauss', 'pickemking'].join(', ')}) can access this dashboard.
          </AlertDescription>
        </Alert>

        {/* Commissioner Assignment */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Assign League Commissioner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select League</label>
                <Select value={selectedLeague} onValueChange={setSelectedLeague}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a league..." />
                  </SelectTrigger>
                  <SelectContent>
                    {leagues.map(league => (
                      <SelectItem key={league.id} value={league.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{league.name}</span>
                          <Badge variant="secondary" className="ml-2">
                            {league.member_count} members
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Select New Commissioner</label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        <div>
                          <div className="font-medium">{user.display_name}</div>
                          <div className="text-xs text-muted-foreground">@{user.username}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  onClick={assignCommissioner}
                  disabled={!selectedLeague || !selectedUser || assigning}
                  className="w-full"
                >
                  {assigning ? 'Assigning...' : 'Assign Commissioner'}
                </Button>
              </div>
            </div>

            {selectedLeague && selectedUser && (
              <Alert className="bg-blue-50 border-blue-200">
                <CheckCircle className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-blue-800">
                  You are about to assign <strong>
                    {users.find(u => u.id === selectedUser)?.display_name}
                  </strong> as commissioner of <strong>
                    {leagues.find(l => l.id === selectedLeague)?.name}
                  </strong>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Current Leagues Overview */}
        <Card>
          <CardHeader>
            <CardTitle>All Leagues Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading leagues...</p>
            ) : leagues.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No leagues found.</p>
            ) : (
              <div className="space-y-3">
                {leagues.map(league => (
                  <div key={league.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{league.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Season {league.season_year}</span>
                        <span>{league.member_count} members</span>
                        <code className="text-xs">/league/{league.slug}</code>
                      </div>
                    </div>
                    <div className="text-right">
                      {league.commissioner ? (
                        <div>
                          <Badge variant="default" className="mb-1">Commissioner</Badge>
                          <div className="text-sm font-medium">{league.commissioner.display_name}</div>
                          <div className="text-xs text-muted-foreground">@{league.commissioner.username}</div>
                        </div>
                      ) : (
                        <Badge variant="destructive">No Commissioner</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}