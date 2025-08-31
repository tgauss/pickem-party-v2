'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Shield, AlertTriangle, ChevronDown, ChevronUp, Settings } from 'lucide-react'

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

interface AdminControlWidgetProps {
  currentUser: User
  league: {
    id: string
    name: string
    slug: string
    invite_code: string
  }
  members: Member[]
  membersWithoutPicks: Member[]
  onAdminPickSubmit?: (userId: string, teamId: number, gameId: string) => void
  children?: React.ReactNode
}

// Simple admin check - in a real app, this would check database roles
function isUserAdmin(user: User): boolean {
  // For now, check if user is admin by username
  // This is a temporary solution - should be replaced with proper DB roles
  const adminUsernames = ['admin', 'tgauss'] // Add actual admin usernames
  return adminUsernames.includes(user.username.toLowerCase())
}

export function AdminControlWidget({ 
  currentUser, 
  league: _league, 
  members, 
  membersWithoutPicks,
  onAdminPickSubmit: _onAdminPickSubmit,
  children 
}: AdminControlWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [adminPickingFor, setAdminPickingFor] = useState<string | null>(null)
  
  const isAdmin = isUserAdmin(currentUser)
  
  if (!isAdmin) {
    return null // Don't render anything for non-admin users
  }

  return (
    <Card className="border-red-600 bg-red-900/10 mb-6">
      <CardHeader>
        <CardTitle 
          className="flex items-center justify-between text-red-400 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <span>Admin Controls</span>
            <div className="text-xs bg-red-600 text-white px-2 py-1 rounded">
              ADMIN ONLY
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="space-y-4">
            <Alert className="border-yellow-600 bg-yellow-900/20">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-yellow-300">
                <strong>Admin Mode:</strong> You have elevated permissions in this league. Regular users cannot see these controls.
              </AlertDescription>
            </Alert>

            {/* Admin Pick Override Section */}
            {membersWithoutPicks.length > 0 && (
              <div className="border border-orange-600 bg-orange-900/20 rounded-lg p-4">
                <h3 className="text-orange-400 font-medium mb-3 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Set Pick for Player
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-orange-300">Select Player:</label>
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
                    <Alert className="border-orange-600 bg-orange-900/30">
                      <AlertTriangle className="h-4 w-4 text-orange-400" />
                      <AlertDescription className="text-orange-300">
                        You are now setting a pick for <strong className="text-orange-100">
                          {membersWithoutPicks.find(m => m.user.id === adminPickingFor)?.user.display_name}
                        </strong>. Select a team below to complete their pick.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            )}

            {/* Additional Admin Controls */}
            <div className="border border-blue-600 bg-blue-900/20 rounded-lg p-4">
              <h3 className="text-blue-400 font-medium mb-3">League Management</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                <div className="text-blue-300">
                  <span className="font-medium">Total Members:</span> {members.length}
                </div>
                <div className="text-blue-300">
                  <span className="font-medium">Active:</span> {members.filter(m => !m.is_eliminated).length}
                </div>
                <div className="text-blue-300">
                  <span className="font-medium">Eliminated:</span> {members.filter(m => m.is_eliminated).length}
                </div>
              </div>
            </div>

            {/* Developer Note */}
            <div className="text-xs text-gray-500 border border-gray-700 bg-gray-900/20 rounded p-2">
              <strong>Dev Note:</strong> This widget only appears for admin users. Current admin check is temporary - should be replaced with proper database roles.
            </div>
          </div>
        </CardContent>
      )}
      
      {/* Render children if provided */}
      {children}
    </Card>
  )
}