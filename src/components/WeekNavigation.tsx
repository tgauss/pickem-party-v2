'use client'

import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

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

  const getWeekLabel = (week: number) => {
    const type = getWeekType(week)
    if (type === 'past') return `Week ${week} ✅`
    if (type === 'current') return `Week ${week} 🎯`
    return `Week ${week} 📅`
  }

  const weeks = Array.from({ length: maxWeek - minWeek + 1 }, (_, i) => i + minWeek)

  return (
    <div className="flex items-center justify-between bg-surface p-4 rounded-lg border border-border mb-6">
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
          <h2 className="text-xl font-bold">
            {getWeekLabel(selectedWeek)}
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
            {weeks.map(week => (
              <SelectItem key={week} value={week.toString()}>
                {getWeekLabel(week)}
              </SelectItem>
            ))}
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
  )
}