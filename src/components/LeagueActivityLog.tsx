'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronUp, Activity, Heart, Users, Calendar, Trophy, DollarSign, XCircle } from 'lucide-react'
import { CustomIcon } from '@/components/ui/custom-icon'

interface ActivityNotification {
  id: string
  notification_type: string
  title: string
  message: string
  metadata?: Record<string, unknown>
  created_at: string
}

interface LeagueActivityLogProps {
  leagueId: string
  className?: string
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'life_adjustment':
      return <Heart className="h-4 w-4 text-blue-500" />
    case 'resurrection':
      return <CustomIcon name="fire" fallback="🔥" alt="Resurrection" size="sm" />
    case 'pick_submitted':
      return <Calendar className="h-4 w-4 text-green-500" />
    case 'elimination':
      return <XCircle className="h-4 w-4 text-red-500" />
    case 'payment':
      return <DollarSign className="h-4 w-4 text-yellow-500" />
    case 'league_update':
      return <Users className="h-4 w-4 text-purple-500" />
    case 'weekly_results':
      return <Trophy className="h-4 w-4 text-orange-500" />
    default:
      return <Activity className="h-4 w-4 text-gray-500" />
  }
}

const getActivityBadgeColor = (type: string) => {
  switch (type) {
    case 'life_adjustment':
      return 'bg-blue-100 text-blue-800'
    case 'resurrection':
      return 'bg-green-100 text-green-800'
    case 'pick_submitted':
      return 'bg-green-100 text-green-800'
    case 'elimination':
      return 'bg-red-100 text-red-800'
    case 'payment':
      return 'bg-yellow-100 text-yellow-800'
    case 'league_update':
      return 'bg-purple-100 text-purple-800'
    case 'weekly_results':
      return 'bg-orange-100 text-orange-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function LeagueActivityLog({ leagueId, className = '' }: LeagueActivityLogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activities, setActivities] = useState<ActivityNotification[]>([])
  const [loading, setLoading] = useState(false)

  const loadActivities = useCallback(async () => {
    if (!leagueId || loading) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/league/activity?leagueId=${leagueId}&type=public&limit=25`)
      const data = await response.json()
      
      if (data.success) {
        setActivities(data.data)
      }
    } catch (error) {
      console.error('Failed to load activity log:', error)
    }
    setLoading(false)
  }, [leagueId, loading])

  useEffect(() => {
    if (isOpen && activities.length === 0) {
      loadActivities()
    }
  }, [isOpen, activities.length, loadActivities])

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000)
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`
    return date.toLocaleDateString()
  }

  const formatActivityType = (type: string) => {
    switch (type) {
      case 'life_adjustment': return 'Life Adjustment'
      case 'resurrection': return 'Resurrection'
      case 'pick_submitted': return 'Pick Submitted'
      case 'elimination': return 'Elimination'
      case 'payment': return 'Payment'
      case 'league_update': return 'League Update'
      case 'weekly_results': return 'Weekly Results'
      default: return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }

  return (
    <div className={className}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-secondary/5">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-primary/10 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <span className="text-primary">League Activity Log</span>
                  <Badge variant="secondary" className="text-xs">
                    {activities.length} {activities.length === 1 ? 'event' : 'events'}
                  </Badge>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-primary" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-primary" />
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>Loading league activity...</p>
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No activity recorded yet.</p>
                  <p className="text-sm">League events will appear here for transparency.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {activities.map((activity, index) => (
                    <div 
                      key={activity.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        index === 0 ? 'bg-primary/5 border-primary/30' : 'bg-background'
                      }`}
                    >
                      <div className="flex-shrink-0 mt-1">
                        {getActivityIcon(activity.notification_type)}
                      </div>
                      
                      <div className="flex-grow min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-grow">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge 
                                variant="secondary" 
                                className={`text-xs px-2 py-1 ${getActivityBadgeColor(activity.notification_type)}`}
                              >
                                {formatActivityType(activity.notification_type)}
                              </Badge>
                              {index === 0 && (
                                <Badge variant="default" className="text-xs bg-green-600">
                                  Recent
                                </Badge>
                              )}
                            </div>
                            <p className="font-medium text-sm text-foreground">{activity.title}</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">{activity.message}</p>
                          </div>
                          <div className="flex-shrink-0">
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(activity.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  🔍 <strong>Transparency:</strong> This log shows all major league events including 
                  life adjustments, resurrections, eliminations, and other important activities.
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  )
}