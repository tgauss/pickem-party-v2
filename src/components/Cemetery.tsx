'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CustomIcon } from '@/components/ui/custom-icon'
import Image from 'next/image'

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
}

interface CemeteryProps {
  eliminatedMembers: Member[]
  seasonStartDate: Date
  currentWeek: number
}

export function Cemetery({ eliminatedMembers }: CemeteryProps) {
  if (eliminatedMembers.length === 0) {
    return null
  }

  const calculateDaysAlive = (eliminatedWeek: number) => {
    // Calculate from season start (first game kickoff) to end of elimination week
    // Each NFL week is 7 days, elimination happens at end of week
    const daysAlive = (eliminatedWeek * 7) - 7 + 7 // Start of week + full week duration
    return Math.max(1, daysAlive) // Minimum 1 day
  }

  const getGravestoneImage = () => {
    // Check if there's a custom gravestone for this user
    const customGravestone = `/Kevyn-Gravestone-Small.png`
    // For now, we'll use Kevyn's gravestone as the template
    // In the future, we could generate custom ones or have different styles
    return customGravestone
  }

  const getEpitaph = (member: Member, daysAlive: number) => {
    const epitaphs = [
      `"Survived ${daysAlive} brutal days"`,
      `"Fought valiantly for ${daysAlive} days"`,
      `"${daysAlive} days of glory"`,
      `"Made it ${daysAlive} days in the arena"`,
      `"${daysAlive} days of fierce competition"`,
    ]
    return epitaphs[Math.floor(Math.random() * epitaphs.length)]
  }

  return (
    <Card className="mt-6 bg-gradient-to-b from-slate-800 to-slate-900 border-slate-600">
      <CardHeader className="text-center">
        <CardTitle className="text-white flex items-center justify-center gap-2">
          <CustomIcon name="skull" fallback="💀" alt="Cemetery" size="md" />
          The Graveyard
          <CustomIcon name="skull" fallback="💀" alt="Cemetery" size="md" />
        </CardTitle>
        <p className="text-slate-300 text-sm">
          &ldquo;Here lie the fallen warriors who dared to enter the arena...&rdquo;
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {eliminatedMembers
            .sort((a, b) => (a.eliminated_week || 0) - (b.eliminated_week || 0))
            .map((member) => {
              const daysAlive = calculateDaysAlive(member.eliminated_week || 1)
              const epitaph = getEpitaph(member, daysAlive)

              return (
                <div key={member.user.id} className="text-center">
                  <div className="relative mb-2">
                    <Image
                      src={getGravestoneImage()}
                      alt={`${member.user.display_name}'s Gravestone`}
                      width={150}
                      height={200}
                      className="mx-auto filter drop-shadow-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <Badge variant="destructive" className="bg-red-800 text-white">
                      Eliminated Week {member.eliminated_week}
                    </Badge>
                    <p className="text-slate-300 text-xs italic">
                      {epitaph}
                    </p>
                    <div className="flex items-center justify-center gap-1 text-xs text-slate-400">
                      <CustomIcon name="calendar" fallback="📅" alt="Days" size="sm" />
                      {daysAlive} days in the league
                    </div>
                  </div>
                </div>
              )
            })}
        </div>

        {/* Cemetery Stats */}
        <div className="mt-6 pt-4 border-t border-slate-600">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-red-400">{eliminatedMembers.length}</div>
              <div className="text-xs text-slate-400">Fallen Warriors</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-400">
                {Math.round(eliminatedMembers.reduce((sum, m) => sum + calculateDaysAlive(m.eliminated_week || 1), 0) / eliminatedMembers.length)}
              </div>
              <div className="text-xs text-slate-400">Avg. Survival (days)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">
                Week {Math.max(...eliminatedMembers.map(m => m.eliminated_week || 1))}
              </div>
              <div className="text-xs text-slate-400">Latest Elimination</div>
            </div>
          </div>
        </div>

        <div className="text-center mt-4">
          <p className="text-slate-400 text-xs italic">
            &ldquo;May their picks rest in peace... 🪦&rdquo;
          </p>
        </div>
      </CardContent>
    </Card>
  )
}