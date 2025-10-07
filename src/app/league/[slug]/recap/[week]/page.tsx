'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Play, Pause, Volume2, Users, Trophy, Skull, Heart } from 'lucide-react'
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
  const week = parseInt(resolvedParams.week)

  const [league, setLeague] = useState<League | null>(null)
  const [picks, setPicks] = useState<Pick[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)

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

    // Initialize audio
    const audioElement = new Audio(`/music/GRIDIRON GAMBLE - Week ${week} Wrap - Gone Too Soon (In the Pool).mp3`)
    setAudio(audioElement)

    return () => {
      if (audioElement) {
        audioElement.pause()
      }
    }
  }, [resolvedParams.slug, week])

  const togglePlay = () => {
    if (audio) {
      if (isPlaying) {
        audio.pause()
      } else {
        audio.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Loading recap...</p>
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <Link href={`/league/${resolvedParams.slug}`} className="text-purple-300 hover:text-purple-100 mb-2 inline-block">
            ← Back to League
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-2">Week {week} Recap</h1>
          <p className="text-xl text-purple-200">{league?.name}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Audio Player Section */}
        <Card className="bg-gradient-to-r from-purple-600 to-pink-600 border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button
                  onClick={togglePlay}
                  size="lg"
                  className="bg-white text-purple-600 hover:bg-gray-100 rounded-full h-16 w-16"
                >
                  {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
                </Button>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Volume2 className="h-5 w-5" />
                    <h3 className="text-xl font-bold">Hear This Week&apos;s Recap Song!</h3>
                  </div>
                  <p className="text-sm text-white/90">Week {week} Wrap - &quot;Gone Too Soon (In the Pool)&quot;</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* News Story Header */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">
              🏈 GRIDIRON GAMBLE WEEKLY REPORT 🏈
            </CardTitle>
            <p className="text-center text-gray-400 text-sm">Week {week} | {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none">
            <div className="text-lg leading-relaxed space-y-4">
              <p className="text-xl font-semibold text-purple-300">
                BREAKING: {eliminated.length} Players Sent to the Cemetery in Week {week} Bloodbath!
              </p>

              <p>
                In what can only be described as a rollercoaster week of shocking upsets and nail-biting finishes,
                Week {week} of The Gridiron Gamble has left the pool significantly smaller. Out of {picks.length} picks
                made, only {wins.length} survived the carnage ({Math.round((wins.length / picks.length) * 100)}% success rate).
                {noPicks.length > 0 && (
                  <> Additionally, {noPicks.length} player{noPicks.length !== 1 ? 's' : ''} failed to submit a pick
                  and paid the ultimate price with an automatic life deduction.</>
                )}
              </p>

              {eliminated.length > 0 && (
                <p>
                  The cemetery gained {eliminated.length} new resident{eliminated.length !== 1 ? 's' : ''} this week: {' '}
                  {eliminated.map((m, i) => (
                    <span key={m.user_id}>
                      <strong className="text-red-400">{m.users.display_name}</strong>
                      {i < eliminated.length - 1 ? (i === eliminated.length - 2 ? ' and ' : ', ') : ''}
                    </span>
                  ))}.
                  {noPicks.some(np => np.is_eliminated && np.eliminated_week === week) ?
                    ' Some fell to bad picks, others to the cruel fate of inaction.' :
                    ' Their picks proved fatal, and they&apos;ve been laid to rest alongside the other fallen competitors.'}
                </p>
              )}

              <p>
                With {activeMembers.length} players still standing, the pressure is mounting. A staggering {oneLife.length} players
                are now down to their final life, while only {twoLives.length} competitors still have both lives intact.
                Week {week + 1} promises to be even more intense as the margin for error has completely disappeared.
              </p>

              <p className="text-gray-400 italic border-l-4 border-purple-500 pl-4">
                &quot;The pool is getting smaller, and the stakes have never been higher. One wrong move, and you&apos;re done.&quot;
                - Anonymous Survivor
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-green-900/50 border-green-700">
            <CardContent className="p-4 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-green-400" />
              <div className="text-3xl font-bold text-green-400">{wins.length}</div>
              <div className="text-sm text-green-200">Correct Picks</div>
            </CardContent>
          </Card>

          <Card className="bg-red-900/50 border-red-700">
            <CardContent className="p-4 text-center">
              <Skull className="h-8 w-8 mx-auto mb-2 text-red-400" />
              <div className="text-3xl font-bold text-red-400">{losses.length}</div>
              <div className="text-sm text-red-200">Wrong Picks</div>
            </CardContent>
          </Card>

          <Card className="bg-purple-900/50 border-purple-700">
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-purple-400" />
              <div className="text-3xl font-bold text-purple-400">{activeMembers.length}</div>
              <div className="text-sm text-purple-200">Still Alive</div>
            </CardContent>
          </Card>

          <Card className="bg-orange-900/50 border-orange-700">
            <CardContent className="p-4 text-center">
              <Heart className="h-8 w-8 mx-auto mb-2 text-orange-400" />
              <div className="text-3xl font-bold text-orange-400">{oneLife.length}</div>
              <div className="text-sm text-orange-200">On The Bubble</div>
            </CardContent>
          </Card>
        </div>

        {/* Eliminations Section */}
        {eliminated.length > 0 && (
          <Card className="bg-gray-800 border-red-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400">
                <Skull className="h-6 w-6" />
                💀 Eliminated This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {eliminated.map((member) => {
                  const pick = picks.find(p => p.user_id === member.user_id)
                  return (
                    <div key={member.user_id} className="flex items-center justify-between p-4 bg-red-900/20 rounded-lg border border-red-800">
                      <div className="flex items-center gap-3">
                        <Image
                          src="/ui-icons/Skull Dead-pickem-part.png"
                          alt="Eliminated"
                          width={32}
                          height={32}
                          className="w-8 h-8"
                        />
                        <div>
                          <div className="font-bold text-white">{member.users.display_name}</div>
                          <div className="text-sm text-gray-400">@{member.users.username}</div>
                        </div>
                      </div>
                      {pick && (
                        <div className="text-right">
                          <div className="text-sm text-gray-400">Picked</div>
                          <div className="font-semibold text-red-400">{pick.teams.city} {pick.teams.name}</div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Wrong Picks Section */}
        {losses.length > 0 && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ❌ Lost a Life This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {losses.map((pick) => {
                  const member = members.find(m => m.user_id === pick.user_id)
                  if (!member || member.is_eliminated) return null

                  return (
                    <div key={pick.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">💔</div>
                        <div>
                          <div className="font-semibold">{pick.users.display_name}</div>
                          <div className="text-sm text-gray-400">{pick.teams.city} {pick.teams.name}</div>
                        </div>
                      </div>
                      <Badge variant={member.lives_remaining === 1 ? "destructive" : "secondary"}>
                        {member.lives_remaining} {member.lives_remaining === 1 ? 'life' : 'lives'} left
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Pick Section */}
        {noPicks.length > 0 && (
          <Card className="bg-gray-800 border-yellow-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-400">
                ⏰ Missed the Deadline (No Pick)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {noPicks.map((member) => (
                  <div key={member.user_id} className="flex items-center justify-between p-4 bg-yellow-900/20 rounded-lg border border-yellow-800">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">⏰</div>
                      <div>
                        <div className="font-bold text-white">{member.users.display_name}</div>
                        <div className="text-sm text-yellow-300">Didn&apos;t submit a pick - Auto-loss</div>
                      </div>
                    </div>
                    <Badge variant={member.is_eliminated ? "destructive" : member.lives_remaining === 1 ? "destructive" : "secondary"}>
                      {member.is_eliminated ? 'ELIMINATED' : `${member.lives_remaining} ${member.lives_remaining === 1 ? 'life' : 'lives'} left`}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Correct Picks Section */}
        {wins.length > 0 && (
          <Card className="bg-gray-800 border-green-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-400">
                ✅ Survived This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {wins.map((pick) => {
                  const member = members.find(m => m.user_id === pick.user_id)
                  if (!member) return null

                  return (
                    <div key={pick.id} className="flex items-center justify-between p-3 bg-green-900/20 rounded-lg border border-green-800">
                      <div className="flex items-center gap-3">
                        <Image
                          src="/ui-icons/green checkmark-pickem-part.png"
                          alt="Correct"
                          width={24}
                          height={24}
                          className="w-6 h-6"
                        />
                        <div>
                          <div className="font-semibold text-green-100">{pick.users.display_name}</div>
                          <div className="text-sm text-gray-400">{pick.teams.city} {pick.teams.name}</div>
                        </div>
                      </div>
                      <Badge className="bg-green-600">
                        {member.lives_remaining} {member.lives_remaining === 1 ? 'life' : 'lives'}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Standings */}
        <Card className="bg-gray-800 border-purple-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🏆 Current Standings After Week {week}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 2 Lives */}
            {twoLives.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-green-400">💪 Safe Zone (2 Lives)</h3>
                <div className="grid gap-2">
                  {twoLives.map((member) => (
                    <div key={member.user_id} className="flex items-center justify-between p-3 bg-green-900/20 rounded-lg">
                      <span className="font-medium">{member.users.display_name}</span>
                      <div className="flex gap-1">
                        <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                        <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 1 Life */}
            {oneLife.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-orange-400">⚠️ On The Bubble (1 Life)</h3>
                <div className="grid gap-2">
                  {oneLife.map((member) => (
                    <div key={member.user_id} className="flex items-center justify-between p-3 bg-orange-900/20 rounded-lg border border-orange-700">
                      <span className="font-medium">{member.users.display_name}</span>
                      <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer CTA */}
        <Card className="bg-gradient-to-r from-purple-900 to-indigo-900 border-none">
          <CardContent className="p-6 text-center">
            <h3 className="text-2xl font-bold mb-2">Week {week + 1} Awaits...</h3>
            <p className="text-purple-200 mb-4">
              Will you survive another week? Make your pick now!
            </p>
            <Link href={`/league/${resolvedParams.slug}`}>
              <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100">
                Return to League
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
