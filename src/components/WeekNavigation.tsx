'use client'

import { ChevronLeft, ChevronRight, ChevronDown, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { CustomIcon } from '@/components/ui/custom-icon'

interface WeekNavigationProps {
  currentWeek: number
  selectedWeek: number
  onWeekChange: (week: number) => void
  maxWeek?: number
  minWeek?: number
}

export function WeekNavigation({ 
  currentWeek, 
  selectedWeek, 
  onWeekChange,
  maxWeek = 18,
  minWeek = 1
}: WeekNavigationProps) {
  const getWeekType = (week: number) => {
    if (week < currentWeek) return 'past'
    if (week === currentWeek) return 'current'
    return 'future'
  }

  const getWeekStatus = (week: number) => {
    const type = getWeekType(week)
    if (type === 'past') return 'COMPLETED'
    if (type === 'current') return 'LIVE'
    return 'UPCOMING'
  }

  const getWeekLabel = (week: number) => {
    const type = getWeekType(week)
    if (type === 'past') return { text: `Week ${week}`, icon: 'checkmark' }
    if (type === 'current') return { text: `Week ${week}`, icon: 'target' }
    return { text: `Week ${week}`, icon: 'calendar' }
  }

  const weeks = Array.from({ length: maxWeek - minWeek + 1 }, (_, i) => i + minWeek)
  const weekType = getWeekType(selectedWeek)

  return (
    <div className="bg-surface rounded-lg border border-border mb-3 sm:mb-4">
      {/* Mobile Layout */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between p-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onWeekChange(Math.max(minWeek, selectedWeek - 1))}
            disabled={selectedWeek <= minWeek}
            className="h-10 w-10"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Select
            value={selectedWeek.toString()}
            onValueChange={(value) => onWeekChange(parseInt(value))}
          >
            <SelectTrigger className="w-auto border-0 gap-2 px-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base">Week {selectedWeek}</span>
                {weekType === 'current' && (
                  <Badge variant="default" className="bg-primary text-black text-xs px-1.5 py-0">
                    LIVE
                  </Badge>
                )}
                <ChevronDown className="h-4 w-4 ml-1" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {weeks.map(week => {
                const status = getWeekStatus(week)
                return (
                  <SelectItem key={week} value={week.toString()}>
                    <div className="flex items-center justify-between gap-3 w-full">
                      <span>Week {week}</span>
                      <Badge 
                        variant={status === 'LIVE' ? 'default' : status === 'COMPLETED' ? 'secondary' : 'outline'}
                        className={status === 'LIVE' ? 'bg-primary text-black' : ''}
                      >
                        {status}
                      </Badge>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onWeekChange(Math.min(maxWeek, selectedWeek + 1))}
            disabled={selectedWeek >= maxWeek}
            className="h-10 w-10"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {selectedWeek !== currentWeek && (
          <div className="px-3 pb-3">
            <Button
              variant="outline"
              onClick={() => onWeekChange(currentWeek)}
              size="sm"
              className="w-full"
            >
              Jump to Current Week
            </Button>
          </div>
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onWeekChange(Math.max(minWeek, selectedWeek - 1))}
            disabled={selectedWeek <= minWeek}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold flex items-center gap-2">
              {getWeekLabel(selectedWeek).text}
              <CustomIcon 
                name={getWeekLabel(selectedWeek).icon} 
                fallback={weekType === 'past' ? '✅' : weekType === 'current' ? '🎯' : '📅'}
                alt={`${weekType} week indicator`}
                size="sm"
              />
            </h2>
            {selectedWeek === currentWeek && (
              <Badge variant="default" className="bg-primary text-black">
                LIVE
              </Badge>
            )}
            {selectedWeek < currentWeek && (
              <Badge variant="secondary">
                COMPLETED
              </Badge>
            )}
            {selectedWeek > currentWeek && (
              <Badge variant="outline">
                UPCOMING
              </Badge>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onWeekChange(Math.min(maxWeek, selectedWeek + 1))}
            disabled={selectedWeek >= maxWeek}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Select
            value={selectedWeek.toString()}
            onValueChange={(value) => onWeekChange(parseInt(value))}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {weeks.map(week => {
                const label = getWeekLabel(week)
                return (
                  <SelectItem key={week} value={week.toString()}>
                    <div className="flex items-center gap-2">
                      {label.text}
                      <CustomIcon 
                        name={label.icon} 
                        fallback={getWeekType(week) === 'past' ? '✅' : getWeekType(week) === 'current' ? '🎯' : '📅'}
                        alt={`${getWeekType(week)} week indicator`}
                        size="sm"
                      />
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          <Button
            variant={selectedWeek === currentWeek ? "default" : "outline"}
            onClick={() => onWeekChange(currentWeek)}
            size="sm"
          >
            Current Week
          </Button>
        </div>
      </div>
    </div>
  )
}