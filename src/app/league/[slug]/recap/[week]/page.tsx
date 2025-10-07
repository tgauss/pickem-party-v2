'use client'

import { useState, useEffect, use, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Play, Pause, Volume2, ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface RecapPageProps {
  params: Promise<{
    slug: string
    week: string
  }>
}

interface User {
  id: string
  username: string
  display_name: string
}

interface Team {
  team_id: number
  key: string
  city: string
  name: string
  logo_url?: string
}

interface Pick {
  id: string
  user_id: string
  team_id: number
  is_correct: boolean | null
  users: User
  teams: Team
}

interface Member {
  user_id: string
  lives_remaining: number
  is_eliminated: boolean
  eliminated_week: number | null
  users: User
}

interface League {
  id: string
  name: string
  slug: string
  season_year: number
}

export default function WeeklyRecapPage({ params }: RecapPageProps) {
  const resolvedParams = use(params)
  const week = parseInt(resolvedParams.week.replace('week', ''))

  const [league, setLeague] = useState<League | null>(null)
  const [picks, setPicks] = useState<Pick[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Hide BoomBox on this page
    const boombox = document.querySelector('[data-boombox]')
    if (boombox) {
      (boombox as HTMLElement).style.display = 'none'
    }

    return () => {
      const boombox = document.querySelector('[data-boombox]')
      if (boombox) {
        (boombox as HTMLElement).style.display = ''
      }
    }
  }, [])

  useEffect(() => {
    const fetchRecapData = async () => {
      const supabase = createClient()

      // Get league
      const { data: leagueData } = await supabase
        .from('leagues')
        .select('*')
        .eq('slug', resolvedParams.slug)
        .single()

      setLeague(leagueData)

      if (leagueData) {
        // Get picks for this week
        const { data: picksData } = await supabase
          .from('picks')
          .select(`
            id,
            user_id,
            team_id,
            is_correct,
            users:user_id (
              id,
              username,
              display_name
            ),
            teams:team_id (
              team_id,
              key,
              city,
              name,
              logo_url
            )
          `)
          .eq('league_id', leagueData.id)
          .eq('week', week)

        // Transform picks data to match interface
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transformedPicks = (picksData || []).map((pick: any) => ({
          id: pick.id,
          user_id: pick.user_id,
          team_id: pick.team_id,
          is_correct: pick.is_correct,
          users: Array.isArray(pick.users) ? pick.users[0] : pick.users,
          teams: Array.isArray(pick.teams) ? pick.teams[0] : pick.teams
        }))
        setPicks(transformedPicks as Pick[])

        // Get member status
        const { data: membersData } = await supabase
          .from('league_members')
          .select(`
            user_id,
            lives_remaining,
            is_eliminated,
            eliminated_week,
            users:user_id (
              id,
              username,
              display_name
            )
          `)
          .eq('league_id', leagueData.id)

        // Transform members data to match interface
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transformedMembers = (membersData || []).map((member: any) => ({
          user_id: member.user_id,
          lives_remaining: member.lives_remaining,
          is_eliminated: member.is_eliminated,
          eliminated_week: member.eliminated_week,
          users: Array.isArray(member.users) ? member.users[0] : member.users
        }))
        setMembers(transformedMembers as Member[])
      }

      setLoading(false)
    }

    fetchRecapData()
  }, [resolvedParams.slug, week])

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading recap...</p>
        </div>
      </div>
    )
  }

  const wins = picks.filter(p => p.is_correct === true)
  const losses = picks.filter(p => p.is_correct === false)
  const eliminated = members.filter(m => m.is_eliminated && m.eliminated_week === week)
  const activeMembers = members.filter(m => !m.is_eliminated)
  const twoLives = activeMembers.filter(m => m.lives_remaining === 2)
  const oneLife = activeMembers.filter(m => m.lives_remaining === 1)

  // Find who didn't pick (were active but have no pick)
  const pickUserIds = picks.map(p => p.user_id)
  const noPicks = members.filter(m => {
    // If eliminated this week, they must have been active before
    const wasActiveBeforeWeek = !m.is_eliminated || m.eliminated_week === week
    return wasActiveBeforeWeek && !pickUserIds.includes(m.user_id)
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={`/music/GRIDIRON GAMBLE - Week ${week} Wrap - Gone Too Soon (In the Pool).mp3`}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <Link href={`/league/${resolvedParams.slug}`} className="inline-flex items-center gap-2 text-primary hover:underline mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to League
          </Link>

          <div className="text-center">
            <Image
              src="/logos/Pickem Part App Logo.svg"
              alt="Pickem Party Logo"
              width={64}
              height={64}
              className="mx-auto mb-4"
            />
            <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{color: 'var(--primary)'}}>
              WEEK {week} RECAP
            </h1>
            <p className="text-xl text-muted-foreground">{league?.name}</p>
          </div>
        </div>

        {/* Audio Player Card */}
        <Card className="mb-6 border-primary/50 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Button
                onClick={togglePlay}
                size="lg"
                className="rounded-full h-16 w-16 flex-shrink-0"
                variant="default"
              >
                {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
              </Button>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Volume2 className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold">Listen to This Week&apos;s Recap Song!</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Week {week} Wrap - &quot;Gone Too Soon (In the Pool)&quot;
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-green-600">{wins.length}</div>
              <div className="text-sm text-muted-foreground">Correct Picks</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-red-600">{losses.length}</div>
              <div className="text-sm text-muted-foreground">Wrong Picks</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-primary">{activeMembers.length}</div>
              <div className="text-sm text-muted-foreground">Still Alive</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-orange-600">{eliminated.length}</div>
              <div className="text-sm text-muted-foreground">Eliminated</div>
            </CardContent>
          </Card>
        </div>

        {/* Narrative Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">Week {week} Story</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p className="text-lg">
              In a week of shocking upsets and crucial decisions, Week {week} proved to be a turning point in The Gridiron Gamble.
              Out of {picks.length} picks made, only {wins.length} survived ({Math.round((wins.length / picks.length) * 100)}% success rate).
              {noPicks.length > 0 && (
                <> Additionally, {noPicks.length} player{noPicks.length !== 1 ? 's' : ''} failed to submit a pick.</>
              )}
            </p>

            {eliminated.length > 0 && (
              <p>
                The cemetery claimed {eliminated.length} new victim{eliminated.length !== 1 ? 's' : ''} this week: {' '}
                {eliminated.map((m, i) => (
                  <span key={m.user_id}>
                    <strong className="text-red-600">{m.users.display_name}</strong>
                    {i < eliminated.length - 1 ? (i === eliminated.length - 2 ? ' and ' : ', ') : ''}
                  </span>
                ))}.
              </p>
            )}

            <p>
              With {activeMembers.length} players still standing, {oneLife.length} are down to their final life while {twoLives.length} still have both lives intact.
            </p>
          </CardContent>
        </Card>

        {/* Player Results */}
        <div className="space-y-6">
          {/* Eliminated */}
          {eliminated.length > 0 && (
            <Card className="border-red-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <Image src="/ui-icons/Skull Dead-pickem-part.png" alt="Eliminated" width={24} height={24} />
                  Eliminated This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {eliminated.map((member) => {
                    const pick = picks.find(p => p.user_id === member.user_id)
                    return (
                      <div key={member.user_id} className="flex items-center justify-between p-3 rounded-lg bg-red-950/20 border border-red-900">
                        <div className="flex items-center gap-3">
                          <Image src="/ui-icons/Skull Dead-pickem-part.png" alt="Dead" width={20} height={20} />
                          <div>
                            <div className="font-semibold">{member.users.display_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {pick ? `${pick.teams.city} ${pick.teams.name}` : 'No pick'}
                            </div>
                          </div>
                        </div>
                        <Badge variant="destructive">ELIMINATED</Badge>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Player Status */}
          <Card>
            <CardHeader>
              <CardTitle>Week {week} Player Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {members
                  .filter(m => picks.some(p => p.user_id === m.user_id) || noPicks.some(np => np.user_id === m.user_id))
                  .map((member) => {
                    const pick = picks.find(p => p.user_id === member.user_id)
                    const noPick = noPicks.find(np => np.user_id === member.user_id)
                    const isPickFinal = pick && pick.is_correct !== null
                    const pickOutcome = pick?.is_correct

                    return (
                      <div
                        key={member.user_id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          isPickFinal ? (pickOutcome ? 'bg-green-950/20 border-green-900' : 'bg-red-950/20 border-red-900') : 'bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {isPickFinal && (
                            <Image
                              src={pickOutcome ? "/ui-icons/green checkmark-pickem-part.png" : "/ui-icons/Skull Dead-pickem-part.png"}
                              alt={pickOutcome ? "Win" : "Loss"}
                              width={20}
                              height={20}
                            />
                          )}
                          {!isPickFinal && noPick && (
                            <Image src="/ui-icons/Hourglass Waiting-pickem-part.png" alt="No pick" width={20} height={20} />
                          )}
                          {!isPickFinal && pick && (
                            <Image src="/ui-icons/Hourglass Waiting-pickem-part.png" alt="Pending" width={20} height={20} />
                          )}
                          <div className="flex-1">
                            <div className="font-semibold">{member.users.display_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {member.lives_remaining} {member.lives_remaining === 1 ? 'life' : 'lives'} remaining
                            </div>
                          </div>
                          <div className="text-right">
                            {pick && (
                              <div className="font-medium">{pick.teams.city} {pick.teams.name}</div>
                            )}
                            {noPick && (
                              <div className="text-sm text-yellow-600">No pick submitted</div>
                            )}
                          </div>
                        </div>
                        <div className="ml-4">
                          {isPickFinal && pickOutcome !== null && (
                            <Badge variant={pickOutcome ? "default" : "destructive"} className={pickOutcome ? 'bg-green-600' : 'bg-red-600'}>
                              {pickOutcome ? 'WIN' : 'LOSS'}
                            </Badge>
                          )}
                          {member.is_eliminated && (
                            <Badge variant="destructive">ELIMINATED</Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>

          {/* Current Standings */}
          <Card>
            <CardHeader>
              <CardTitle>Standings After Week {week}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {twoLives.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-green-600">💪 Safe (2 Lives) - {twoLives.length} players</h3>
                  <div className="space-y-1">
                    {twoLives.map(m => (
                      <div key={m.user_id} className="p-2 bg-green-950/20 rounded">
                        {m.users.display_name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {oneLife.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-orange-600">⚠️ On the Bubble (1 Life) - {oneLife.length} players</h3>
                  <div className="space-y-1">
                    {oneLife.map(m => (
                      <div key={m.user_id} className="p-2 bg-orange-950/20 rounded border border-orange-900">
                        {m.users.display_name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link href={`/league/${resolvedParams.slug}`}>
            <Button size="lg" variant="default">
              Return to League
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
