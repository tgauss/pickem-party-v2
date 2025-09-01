'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { 
  Shield, 
  Heart, 
  Plus, 
  Minus, 
  History, 
  Users, 
  ArrowLeft,
  AlertTriangle
} from 'lucide-react'
import { CustomIcon } from '@/components/ui/custom-icon'
import { ResurrectPlayers } from '@/components/admin/ResurrectPlayers'

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
  max_participants?: number
  commissioner_id?: string
}

interface Member {
  user: User
  lives_remaining: number
  is_eliminated: boolean
  eliminated_week?: number
  is_paid: boolean
}

interface LifeAdjustment {
  id: string
  lives_before: number
  lives_after: number
  adjustment_amount: number
  reason: string
  notes?: string
  adjustment_type: string
  created_at: string
  user: { username: string; display_name: string }
  adjusted_by_user: { username: string; display_name: string }
}

interface ActivityNotification {
  id: string
  notification_type: string
  title: string
  message: string
  metadata?: Record<string, unknown>
  created_at: string
}

// Simple admin check (matches API authorization)
function isUserAdmin(user: User, leagueCommissionerId?: string): boolean {
  const superAdminUsernames = ['admin', 'tgauss', 'pickemking']
  const isSuperAdmin = superAdminUsernames.includes(user.username.toLowerCase())
  const isCommissioner = leagueCommissionerId === user.id
  
  return isSuperAdmin || isCommissioner
}

export default function AdminDashboard({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const resolvedParams = use(params)
  const [user, setUser] = useState<User | null>(null)
  const [league, setLeague] = useState<League | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  
  // Lives adjustment state
  const [selectedMember, setSelectedMember] = useState<string>('')
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(1)
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [adjustmentNotes, setAdjustmentNotes] = useState('')
  const [adjusting, setAdjusting] = useState(false)
  
  // Activity log state
  const [lifeAdjustments, setLifeAdjustments] = useState<LifeAdjustment[]>([])
  const [activityLog, setActivityLog] = useState<ActivityNotification[]>([])
  const [activeTab, setActiveTab] = useState('lives')

  const supabase = createClient()

  const loadLeagueData = useCallback(async (currentUser: User, slug: string) => {
    try {
      setLoading(true)
      
      // Load league
      const { data: leagueData, error: leagueError } = await supabase
        .from('leagues')
        .select('*')
        .eq('slug', slug)
        .single()
      
      if (leagueError || !leagueData) {
        console.error('League query error:', leagueError)
        alert('League not found!')
        window.location.href = '/dashboard'
        return
      }
      
      setLeague(leagueData)
      
      // Check admin access now that we have league data
      if (!isUserAdmin(currentUser, leagueData.commissioner_id)) {
        alert('Access denied: Only commissioners and super admins can access this dashboard')
        window.location.href = `/league/${slug}`
        return
      }
      
      // Load league members
      const { data: membersData } = await supabase
        .from('league_members')
        .select(`
          *,
          users(*)
        `)
        .eq('league_id', leagueData.id)
      
      if (membersData) {
        const formattedMembers = membersData.map((m) => ({
          user: m.users as User,
          lives_remaining: m.lives_remaining || 0,
          is_eliminated: m.is_eliminated || false,
          eliminated_week: m.eliminated_week,
          is_paid: m.is_paid || false
        }))
        setMembers(formattedMembers)
      }
      
      setInitialized(true)
    } catch (error) {
      console.error('Error loading league data:', error)
      alert('Error loading league data')
      window.location.href = '/dashboard'
    }
    setLoading(false)
  }, [supabase])

  const loadActivityData = useCallback(async () => {
    if (!league) return

    try {
      // Load life adjustments
      const adjustmentResponse = await fetch('/api/league/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId: league.id })
      })
      const adjustmentData = await adjustmentResponse.json()
      if (adjustmentData.success) {
        setLifeAdjustments(adjustmentData.data)
      }

      // Load activity notifications
      const activityResponse = await fetch(`/api/league/activity?leagueId=${league.id}&type=admin&limit=100`)
      const activityData = await activityResponse.json()
      if (activityData.success) {
        setActivityLog(activityData.data)
      }
    } catch (error) {
      console.error('Error loading activity data:', error)
    }
  }, [league])

  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser')
    if (!currentUser) {
      window.location.href = '/'
      return
    }
    
    const userData = JSON.parse(currentUser)
    setUser(userData)
    
    // We'll check admin access after loading league data to verify commissioner status
    
    loadLeagueData(userData, resolvedParams.slug)
  }, [loadLeagueData, resolvedParams.slug])

  useEffect(() => {
    if (initialized && league) {
      loadActivityData()
    }
  }, [initialized, league, loadActivityData])

  const adjustLives = async (amount: number) => {
    if (!user || !league || !selectedMember || !adjustmentReason.trim()) {
      alert('Please fill in all required fields')
      return
    }

    setAdjusting(true)
    try {
      const response = await fetch('/api/admin/adjust-lives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId: league.id,
          targetUserId: selectedMember,
          adjustmentAmount: amount,
          reason: adjustmentReason,
          notes: adjustmentNotes,
          adjustedBy: user.id
        })
      })

      const data = await response.json()
      if (data.success) {
        alert(`✅ ${data.message}`)
        
        // Reset form
        setSelectedMember('')
        setAdjustmentAmount(1)
        setAdjustmentReason('')
        setAdjustmentNotes('')
        
        // Reload data
        await loadLeagueData(user, resolvedParams.slug)
        await loadActivityData()
      } else {
        alert(`❌ ${data.error}`)
      }
    } catch (error) {
      console.error('Error adjusting lives:', error)
      alert('❌ Network error adjusting lives')
    }
    setAdjusting(false)
  }

  const handleResurrectComplete = () => {
    loadLeagueData(user!, resolvedParams.slug)
    loadActivityData()
  }

  if (!user || !league) return <div className="p-4">Loading admin dashboard...</div>

  const selectedMemberData = members.find(m => m.user.id === selectedMember)

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            onClick={() => window.location.href = `/league/${resolvedParams.slug}`}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to League
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{color: 'var(--primary)'}}>
              <Shield className="h-6 w-6" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">{league.name}</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="lives">Lives Management</TabsTrigger>
            <TabsTrigger value="players">Player Management</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
            <TabsTrigger value="league">League Settings</TabsTrigger>
          </TabsList>

          {/* Lives Management Tab */}
          <TabsContent value="lives">
            <div className="grid gap-6">
              {/* Lives Adjustment Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Adjust Player Lives
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label>Select Player</Label>
                      <Select value={selectedMember} onValueChange={setSelectedMember}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a player..." />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map(member => (
                            <SelectItem key={member.user.id} value={member.user.id}>
                              <div className="flex items-center gap-2">
                                <span>{member.user.display_name}</span>
                                <Badge variant={member.is_eliminated ? "destructive" : "default"}>
                                  {member.lives_remaining} {member.lives_remaining === 1 ? 'life' : 'lives'}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedMemberData && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Current: {selectedMemberData.lives_remaining} lives 
                          {selectedMemberData.is_eliminated && ' (Eliminated)'}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label>Adjustment Amount</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAdjustmentAmount(Math.max(-10, adjustmentAmount - 1))}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          min="-10"
                          max="10"
                          value={adjustmentAmount}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdjustmentAmount(parseInt(e.target.value) || 0)}
                          className="w-20 text-center"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAdjustmentAmount(Math.min(10, adjustmentAmount + 1))}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          ({adjustmentAmount > 0 ? '+' : ''}{adjustmentAmount} {Math.abs(adjustmentAmount) === 1 ? 'life' : 'lives'})
                        </span>
                      </div>
                    </div>

                    <div>
                      <Label>Reason *</Label>
                      <Input
                        value={adjustmentReason}
                        onChange={(e) => setAdjustmentReason(e.target.value)}
                        placeholder="e.g., Bonus life, Correction, Manual adjustment..."
                        required
                      />
                    </div>

                    <div>
                      <Label>Notes (Optional)</Label>
                      <Textarea
                        value={adjustmentNotes}
                        onChange={(e) => setAdjustmentNotes(e.target.value)}
                        placeholder="Additional details about this adjustment..."
                        rows={3}
                      />
                    </div>

                    <Button 
                      onClick={() => adjustLives(adjustmentAmount)}
                      disabled={!selectedMember || !adjustmentReason.trim() || adjusting || adjustmentAmount === 0}
                      className="w-full"
                    >
                      {adjusting ? 'Adjusting...' : 
                       adjustmentAmount > 0 ? `Add ${adjustmentAmount} ${Math.abs(adjustmentAmount) === 1 ? 'Life' : 'Lives'}` :
                       `Remove ${Math.abs(adjustmentAmount)} ${Math.abs(adjustmentAmount) === 1 ? 'Life' : 'Lives'}`}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Current Lives Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Lives Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {members.map(member => (
                      <div 
                        key={member.user.id}
                        className={`p-4 rounded-lg border ${
                          member.is_eliminated ? 'bg-destructive/10 border-destructive/30' : 'bg-background'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{member.user.display_name}</p>
                            <p className="text-sm text-muted-foreground">@{member.user.username}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              {Array.from({ length: Math.max(0, member.lives_remaining) }).map((_, i) => (
                                <CustomIcon key={i} name="heart" fallback="❤️" alt="Life" size="sm" />
                              ))}
                              {member.lives_remaining === 0 && (
                                <Badge variant="destructive">Eliminated</Badge>
                              )}
                            </div>
                            <span className="text-sm font-mono">
                              {member.lives_remaining}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Player Management Tab */}
          <TabsContent value="players">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Resurrect Eliminated Players
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResurrectPlayers 
                    leagueId={league.id} 
                    onResurrect={handleResurrectComplete}
                  />
                </CardContent>
              </Card>

              {/* League Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>League Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {members.filter(m => !m.is_eliminated).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Active Players</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {members.filter(m => m.is_eliminated).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Eliminated</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {members.filter(m => !m.is_paid).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Unpaid</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {members.reduce((sum, m) => sum + m.lives_remaining, 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Lives</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Activity Log Tab */}
          <TabsContent value="activity">
            <div className="space-y-6">
              {/* Life Adjustments History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Life Adjustments History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {lifeAdjustments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No life adjustments recorded yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {lifeAdjustments.map(adjustment => (
                        <div key={adjustment.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant={adjustment.adjustment_type === 'resurrection' ? 'default' : 'secondary'}>
                                  {adjustment.adjustment_type}
                                </Badge>
                                <span className="font-medium">{adjustment.user.display_name}</span>
                                <span className="text-sm text-muted-foreground">
                                  {adjustment.lives_before} → {adjustment.lives_after} lives
                                </span>
                              </div>
                              <p className="text-sm"><strong>Reason:</strong> {adjustment.reason}</p>
                              {adjustment.notes && (
                                <p className="text-sm text-muted-foreground"><strong>Notes:</strong> {adjustment.notes}</p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                By {adjustment.adjusted_by_user.display_name} • {new Date(adjustment.created_at).toLocaleString()}
                              </p>
                            </div>
                            <div className={`px-2 py-1 rounded text-sm font-mono ${
                              adjustment.adjustment_amount > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {adjustment.adjustment_amount > 0 ? '+' : ''}{adjustment.adjustment_amount}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* General Activity Log */}
              <Card>
                <CardHeader>
                  <CardTitle>All League Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {activityLog.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No activity recorded yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {activityLog.map(notification => (
                        <div key={notification.id} className="p-3 border rounded-lg">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                              {notification.notification_type === 'life_adjustment' && <Heart className="h-4 w-4 text-blue-500" />}
                              {notification.notification_type === 'resurrection' && <CustomIcon name="fire" fallback="🔥" alt="Resurrection" size="sm" />}
                              {!['life_adjustment', 'resurrection'].includes(notification.notification_type) && 
                                <div className="h-4 w-4 rounded-full bg-gray-400" />}
                            </div>
                            <div className="flex-grow min-w-0">
                              <p className="font-medium text-sm">{notification.title}</p>
                              <p className="text-sm text-muted-foreground">{notification.message}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(notification.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* League Settings Tab */}
          <TabsContent value="league">
            <Card>
              <CardHeader>
                <CardTitle>League Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>League Name</Label>
                      <Input value={league.name} disabled />
                    </div>
                    <div>
                      <Label>Invite Code</Label>
                      <Input value={league.invite_code} disabled />
                    </div>
                    <div>
                      <Label>Buy-in Amount</Label>
                      <Input value={`$${league.buy_in_amount}`} disabled />
                    </div>
                    <div>
                      <Label>Season Year</Label>
                      <Input value={league.season_year} disabled />
                    </div>
                  </div>
                  
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Additional league settings will be available in future updates.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}