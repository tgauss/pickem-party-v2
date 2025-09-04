'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CustomIcon } from '@/components/ui/custom-icon'
import { TutorialWizard } from '@/components/TutorialWizard'
import Image from 'next/image'

function HomePageContent() {
  const searchParams = useSearchParams()
  const inviteCode = searchParams.get('invite')
  const inviterName = searchParams.get('inviter')
  const [showAuth, setShowAuth] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [pin, setPin] = useState('')
  const [isLogin, setIsLogin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [invitedLeague, setInvitedLeague] = useState<{
    id: string
    name: string
    slug: string
    invite_code: string
    buy_in_amount: number
    season_year: number
    member_count?: number
  } | null>(null)
  const [checkingInvite, setCheckingInvite] = useState(false)
  const [countdown, setCountdown] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
    expired: boolean
  } | null>(null)
  const supabase = createClient()

  // Countdown to join deadline (Sept 6th, 12pm PST)
  useEffect(() => {
    const deadline = new Date('2025-09-06T12:00:00-08:00') // Sept 6th 12pm PST
    
    const updateCountdown = () => {
      const now = new Date()
      const timeDiff = deadline.getTime() - now.getTime()
      
      if (timeDiff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true })
        return
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)

      setCountdown({ days, hours, minutes, seconds, expired: false })
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [])

  // Check if user is already logged in and handle invite
  useEffect(() => {
    const checkAuthAndInvite = async () => {
      const currentUser = localStorage.getItem('currentUser')
      
      if (inviteCode) {
        setCheckingInvite(true)
        // Check if invite code is valid and get league
        const { data: league } = await supabase
          .from('leagues')
          .select('*')
          .eq('invite_code', inviteCode)
          .single()
        
        if (league) {
          // Get member count separately
          const { count: memberCount } = await supabase
            .from('league_members')
            .select('*', { count: 'exact', head: true })
            .eq('league_id', league.id)
          
          
          setInvitedLeague({
            ...league,
            member_count: memberCount || 0
          })
          
          if (currentUser) {
            // User is logged in, offer to join league
            const user = JSON.parse(currentUser)
            
            // Check if already a member
            const { data: existingMember } = await supabase
              .from('league_members')
              .select('*')
              .eq('league_id', league.id)
              .eq('user_id', user.id)
              .single()
            
            if (existingMember) {
              // Already a member, redirect to league
              window.location.href = `/league/${league.slug}`
            }
          }
        }
        setCheckingInvite(false)
      } else if (currentUser) {
        // No invite, just redirect logged-in users
        window.location.href = '/dashboard'
      }
    }
    
    checkAuthAndInvite()
  }, [inviteCode, supabase])

  const handleAuth = async () => {
    setLoading(true)
    
    if (isLogin) {
      // Simple login - just check if user exists
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('username', username.toLowerCase())
        .single()
        
      if (user) {
        // Store user in localStorage for MVP (no secure sessions needed)
        localStorage.setItem('currentUser', JSON.stringify(user))
        window.location.href = '/dashboard'
      } else {
        alert('Player not found! Try signing up first.')
      }
    } else {
      // Sign up
      const { data, error } = await supabase
        .from('users')
        .insert({
          username: username.toLowerCase(),
          display_name: displayName,
          email: email.toLowerCase(),
          phone_number: phoneNumber.trim(),
          pin_hash: pin ? pin : null // Store PIN directly for MVP simplicity
        })
        .select()
        .single()
        
      if (data) {
        localStorage.setItem('currentUser', JSON.stringify(data))
        
        // Auto-join invited league if applicable
        if (invitedLeague) {
          await supabase
            .from('league_members')
            .insert({
              league_id: invitedLeague.id,
              user_id: data.id,
              lives_remaining: 2, // Default lives per player
              is_eliminated: false,
              is_paid: false
            })
        }
        
        // Show tutorial for new users
        setNewUserName(data.display_name)
        setShowTutorial(true)
        setShowAuth(false)
      } else {
        // Check if it's a duplicate email error
        if (error?.message?.includes('duplicate key value violates unique constraint') && 
            error?.message?.includes('users_email_key')) {
          if (confirm('This email already has an account! Click OK to go to the login page, or Cancel to try again.')) {
            window.location.href = '/login'
          }
        } else if (error?.message?.includes('duplicate key value violates unique constraint') && 
                   error?.message?.includes('users_username_key')) {
          alert('This username is already taken. Please choose a different username.')
        } else {
          alert('Sign up failed: ' + (error?.message || 'Unknown error'))
        }
      }
    }
    setLoading(false)
  }

  const handleTutorialComplete = () => {
    setShowTutorial(false)
    // Mark tutorial as seen
    const currentUser = localStorage.getItem('currentUser')
    if (currentUser) {
      const user = JSON.parse(currentUser)
      localStorage.setItem('tutorialSeen', JSON.stringify({ userId: user.id, seen: true }))
    }
    // Redirect to invited league or dashboard
    if (invitedLeague) {
      window.location.href = `/league/${invitedLeague.slug}`
    } else {
      window.location.href = '/dashboard'
    }
  }

  const handleJoinLeague = async () => {
    if (!invitedLeague) return
    
    setLoading(true)
    const currentUser = localStorage.getItem('currentUser')
    if (currentUser) {
      const user = JSON.parse(currentUser)
      
      const { error } = await supabase
        .from('league_members')
        .insert({
          league_id: invitedLeague.id,
          user_id: user.id,
          lives_remaining: 2, // Default lives per player
          is_eliminated: false,
          is_paid: false
        })
      
      if (!error) {
        window.location.href = `/league/${invitedLeague.slug}`
      } else {
        alert('Failed to join league: ' + error.message)
      }
    }
    setLoading(false)
  }

  if (showAuth) {
    return (
      <div className="flex-1 bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 retro-border">
          <div className="text-center mb-8">
            <div className="mb-6">
              <Image 
                src="/logos/Pickem Part App Logo.svg" 
                alt="Pickem Party Logo"
                width={128}
                height={128}
                className="mx-auto"
              />
            </div>
            <h1 className="text-3xl font-bold mb-2 fight-text" style={{color: 'var(--primary)'}}>
              PICK&apos;EM PARTY
            </h1>
            <p className="text-muted-foreground">
              {isLogin ? 'ENTER THE ARENA' : 'JOIN THE BATTLE'}
            </p>
            {!isLogin && (
              <div className="mt-4 p-3 bg-surface/50 rounded-lg text-sm text-muted-foreground">
                <p className="mb-2">🏈 <strong>Quick Setup:</strong></p>
                <p>• <strong>Username:</strong> How you login (like &quot;jaren&quot; or &quot;hayden&quot;)</p>
                <p>• <strong>Display Name:</strong> What others see in the league</p>
                <p>• <strong>Email & Phone:</strong> For important league updates</p>
                <p>• <strong>PIN:</strong> Your 4-digit password to login</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="username">
                Username {isLogin ? '' : '(for login)'}
              </Label>
              <Input
                id="username"
                placeholder={isLogin ? "Enter your username" : "Create username (e.g., jaren, hayden)"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-surface border-border min-h-[44px] text-base"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
              />
              {!isLogin && (
                <p className="text-xs text-muted-foreground mt-1">
                  This is what you&apos;ll type to login. Keep it simple!
                </p>
              )}
            </div>

            {!isLogin && (
              <>
                <div>
                  <Label htmlFor="displayName">Display Name (what others see)</Label>
                  <Input
                    id="displayName"
                    placeholder="Your full name (e.g., Jaren Petrusich)"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-surface border-border min-h-[44px] text-base"
                    autoComplete="name"
                    autoCapitalize="words"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This appears in leagues and standings
                  </p>
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-surface border-border min-h-[44px] text-base"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                </div>
                <div>
                  <Label htmlFor="phoneNumber">Phone Number (Required)</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="bg-surface border-border min-h-[44px] text-base"
                    autoComplete="tel"
                    inputMode="tel"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Required for league admin communication and important updates
                  </p>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="pin">
                4-Digit PIN {!isLogin && '(Required)'}
              </Label>
              <Input
                id="pin"
                type="number"
                placeholder="1234"
                value={pin}
                onChange={(e) => setPin(e.target.value.slice(0, 4))}
                className="bg-surface border-border min-h-[44px] text-base"
                autoComplete="current-password"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                required={!isLogin}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {isLogin 
                  ? "Enter your PIN to login" 
                  : "Your secret 4-digit password for logging in"
                }
              </p>
            </div>

            <Button 
              onClick={handleAuth}
              disabled={loading || !username || !pin || (!isLogin && (!displayName || !email || !phoneNumber))}
              className="w-full fight-text"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)'
              }}
            >
              {loading ? '...' : isLogin ? 'FIGHT!' : 'ENTER ARENA!'}
            </Button>

            {!isLogin && (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => setIsLogin(true)}
                  className="w-full"
                >
                  Returning Fighter? Quick Login Here
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  or{' '}
                  <a 
                    href="/login" 
                    className="text-primary hover:underline font-medium"
                  >
                    use dedicated login page
                  </a>
                </p>
              </div>
            )}
            
            {isLogin && (
              <Button
                variant="outline"
                onClick={() => setIsLogin(false)}
                className="w-full"
              >
                New Fighter? Sign Up Instead
              </Button>
            )}
            
            <Button
              variant="ghost"
              onClick={() => setShowAuth(false)}
              className="w-full text-muted-foreground"
            >
              ← Back to Home
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Invite Landing Page
  if (inviteCode && invitedLeague) {
    const currentUser = localStorage.getItem('currentUser')
    const totalPot = (invitedLeague.member_count || 0) * (invitedLeague.buy_in_amount || 0)
    const deadlineExpired = countdown?.expired || false
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg retro-border shadow-2xl bg-gradient-to-b from-surface to-background border-2">
          <div className="text-center p-6 sm:p-8">
            {/* Logo without animation */}
            <div className="mb-6">
              <Image 
                src="/logos/Pickem Part App Logo.svg" 
                alt="Pickem Party Logo"
                width={100}
                height={100}
                className="mx-auto sm:w-[120px] sm:h-[120px]"
              />
            </div>
            
            {/* Exciting header */}
            <div className="mb-6">
              <div className="flex justify-center mb-4">
                <CustomIcon name="mail" fallback="📧" alt="Invite" size="lg" />
                <CustomIcon name="fire" fallback="🔥" alt="Hot" size="lg" className="ml-2" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 fight-text" style={{color: 'var(--primary)'}}>
                {inviterName ? `${decodeURIComponent(inviterName)} INVITES YOU!` : 'YOU&apos;VE BEEN INVITED!'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {inviterName 
                  ? `${decodeURIComponent(inviterName)} is inviting you to an epic battle for the NFL Season. Can you survive and win up to $${totalPot}?`
                  : 'A friend wants you to join their NFL Survivor Pool'
                }
              </p>
            </div>
            
            {/* League Info Card */}
            <div className="bg-gradient-to-r from-primary/20 to-secondary/20 border-2 border-primary/50 rounded-lg p-4 mb-6 shadow-lg">
              <h2 className="text-lg sm:text-xl font-bold text-primary mb-3 fight-text">{invitedLeague.name}</h2>
              
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">${invitedLeague.buy_in_amount || 0}</div>
                  <div className="text-xs text-muted-foreground">Buy-in</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">${totalPot}</div>
                  <div className="text-xs text-muted-foreground">Total Pot</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CustomIcon name="heart" fallback="❤️" alt="Lives" size="sm" />
                  2 Lives
                </div>
                <div className="flex items-center gap-1">
                  <CustomIcon name="users" fallback="👥" alt="Members" size="sm" />
                  {invitedLeague.member_count || 0} Fighters
                </div>
              </div>
            </div>

            {/* Countdown Timer - Only show if deadline hasn't passed */}
            {countdown && !deadlineExpired && (
              <div className="bg-destructive/20 border border-destructive/50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CustomIcon name="hourglass" fallback="⏰" alt="Countdown" size="sm" />
                  <span className="font-semibold text-destructive text-sm">JOIN DEADLINE</span>
                </div>
                <div className="grid grid-cols-4 gap-1 sm:gap-2 mb-2">
                  <div className="text-center">
                    <div className="text-lg sm:text-xl font-bold text-destructive font-['Press_Start_2P']">{countdown.days}</div>
                    <div className="text-xs text-muted-foreground">DAYS</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg sm:text-xl font-bold text-destructive font-['Press_Start_2P']">{countdown.hours}</div>
                    <div className="text-xs text-muted-foreground">HRS</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg sm:text-xl font-bold text-destructive font-['Press_Start_2P']">{countdown.minutes}</div>
                    <div className="text-xs text-muted-foreground">MIN</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg sm:text-xl font-bold text-destructive font-['Press_Start_2P']">{countdown.seconds}</div>
                    <div className="text-xs text-muted-foreground">SEC</div>
                  </div>
                </div>
                <p className="text-xs text-destructive">
                  Until Saturday Sept 6th at 12pm PST
                </p>
              </div>
            )}
            
            {!deadlineExpired && (
              <>
                {currentUser ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      🏈 Ready to join the battle, fighter?
                    </p>
                    <Button 
                      onClick={handleJoinLeague}
                      disabled={loading}
                      className="w-full fight-text text-lg py-6 animate-pulse hover:animate-none transition-all transform hover:scale-105 shadow-lg"
                      style={{
                        backgroundColor: 'var(--primary)',
                        color: 'var(--primary-foreground)',
                        animation: 'pulse 2s infinite'
                      }}
                    >
                      <CustomIcon name="football" fallback="🏈" alt="Football" size="sm" className="mr-2" />
                      {loading ? 'JOINING...' : 'JOIN THE FIGHT!'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.location.href = '/dashboard'}
                      className="w-full"
                      size="sm"
                    >
                      Maybe Later
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      🎯 Create your account to join this epic battle!
                    </p>
                    <Button 
                      onClick={() => setShowAuth(true)}
                      className="w-full fight-text text-lg py-6 animate-pulse hover:animate-none transition-all transform hover:scale-105 shadow-lg"
                      style={{
                        backgroundColor: 'var(--primary)',
                        color: 'var(--primary-foreground)',
                        animation: 'pulse 2s infinite'
                      }}
                    >
                      <CustomIcon name="football" fallback="🏈" alt="Football" size="sm" className="mr-2" />
                      SIGN UP & JOIN
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsLogin(true)
                        setShowAuth(true)
                      }}
                      className="w-full"
                      size="sm"
                    >
                      Already have an account? Login
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      </div>
    )
  }

  // Loading state for invite check
  if (checkingInvite) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <CustomIcon name="hourglass" fallback="⏰" alt="Loading" size="xl" />
          <p className="text-muted-foreground mt-4">Checking invite...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 sm:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-8">
              <Image 
                src="/logos/Pickem Part App Logo.svg" 
                alt="Pickem Party Logo"
                width={200}
                height={200}
                className="mx-auto"
              />
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold mb-6 fight-text" style={{color: 'var(--primary)'}}>
              PICK&apos;EM PARTY
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              The ultimate NFL Survivor Pool experience. Pick one team each week. 
              If they lose, you&apos;re eliminated. Last fighter standing wins it all!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg"
                onClick={() => setShowAuth(true)}
                className="w-full sm:w-auto fight-text text-lg px-8 py-6"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--primary-foreground)'
                }}
              >
                <CustomIcon name="football" fallback="🏈" alt="Football" size="sm" className="mr-2" />
                ENTER THE ARENA
              </Button>
              <Button 
                variant="outline"
                size="lg"
                onClick={() => setShowAuth(true)}
                className="w-full sm:w-auto text-lg px-8 py-6"
              >
                Already Fighting? Login
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 sm:py-24 bg-surface/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 fight-text">
              HOW THE BATTLE WORKS
            </h2>
            <p className="text-lg text-muted-foreground">
              Simple rules, intense strategy, epic battles every Sunday
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="retro-border bg-card/50 backdrop-blur-sm">
              <CardHeader className="text-center">
                <div className="mb-4 flex justify-center">
                  <CustomIcon name="target" fallback="🎯" alt="Target" size="xl" />
                </div>
                <CardTitle className="fight-text text-primary">STEP 1: PICK</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Choose one NFL team each week that you think will WIN their game. 
                  But here&apos;s the catch - you can only use each team ONCE per season!
                </p>
              </CardContent>
            </Card>

            <Card className="retro-border bg-card/50 backdrop-blur-sm">
              <CardHeader className="text-center">
                <div className="mb-4 flex justify-center">
                  <CustomIcon name="skull" fallback="💀" alt="Elimination" size="xl" />
                </div>
                <CardTitle className="fight-text text-secondary">STEP 2: SURVIVE</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  If your team WINS, you advance to the next week. 
                  If they LOSE or TIE, you&apos;re ELIMINATED from the pool. No second chances!
                </p>
              </CardContent>
            </Card>

            <Card className="retro-border bg-card/50 backdrop-blur-sm">
              <CardHeader className="text-center">
                <div className="mb-4 flex justify-center">
                  <CustomIcon name="trophy" fallback="🏆" alt="Victory" size="xl" />
                </div>
                <CardTitle className="fight-text text-primary">STEP 3: WIN</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Be the last fighter standing at the end of the NFL season 
                  and claim your rightful place as the ultimate survivor!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 fight-text">
              BATTLE FEATURES
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need for the ultimate survivor pool experience
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Features List */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <CustomIcon name="fire" fallback="🔥" alt="Real-time" size="md" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 fight-text">REAL-TIME UPDATES</h3>
                  <p className="text-muted-foreground">
                    Get live game scores, instant elimination alerts, and real-time league standings 
                    as the action unfolds every Sunday.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <CustomIcon name="target" fallback="🎯" alt="Strategy" size="md" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 fight-text">SMART STRATEGY TOOLS</h3>
                  <p className="text-muted-foreground">
                    See which teams you&apos;ve already used, check upcoming schedules, 
                    and get betting line insights to make the perfect pick.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <CustomIcon name="trophy" fallback="🏆" alt="Competition" size="md" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 fight-text">EPIC COMPETITION</h3>
                  <p className="text-muted-foreground">
                    Create private leagues with friends, track detailed stats, 
                    and battle it out for bragging rights and cold hard cash.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <CustomIcon name="heart" fallback="❤️" alt="Lives" size="md" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 fight-text">MULTIPLE LIVES MODE</h3>
                  <p className="text-muted-foreground">
                    Choose classic sudden-death or multi-life modes where you can survive 
                    a few bad picks before elimination. Perfect for longer battles!
                  </p>
                </div>
              </div>
            </div>

            {/* Placeholder Screenshot */}
            <div className="relative">
              <div className="aspect-[9/16] bg-gradient-to-br from-surface to-card rounded-2xl retro-border flex items-center justify-center">
                <div className="text-center space-y-4">
                  <CustomIcon name="football" fallback="🏈" alt="App Preview" size="xl" />
                  <div>
                    <p className="font-semibold">App Screenshot</p>
                    <p className="text-sm text-muted-foreground">Placeholder for mobile app preview</p>
                  </div>
                </div>
              </div>
              <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground">
                Mobile First
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 sm:py-24 bg-surface/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-3xl sm:text-4xl font-bold fight-text" style={{color: 'var(--primary)'}}>
                18
              </div>
              <p className="text-sm text-muted-foreground">Weeks of Battle</p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl sm:text-4xl font-bold fight-text" style={{color: 'var(--secondary)'}}>
                32
              </div>
              <p className="text-sm text-muted-foreground">NFL Teams</p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl sm:text-4xl font-bold fight-text" style={{color: 'var(--primary)'}}>
                1
              </div>
              <p className="text-sm text-muted-foreground">Ultimate Survivor</p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl sm:text-4xl font-bold fight-text" style={{color: 'var(--secondary)'}}>
                ∞
              </div>
              <p className="text-sm text-muted-foreground">Glory Points</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 fight-text">
            READY TO ENTER THE ARENA?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join the most intense NFL survivor pool experience. Create your fighter, 
            join a league, and prove you have what it takes to be the last one standing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => setShowAuth(true)}
              className="fight-text text-lg px-8 py-6"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)'
              }}
            >
              <CustomIcon name="football" fallback="🏈" alt="Football" size="sm" className="mr-2" />
              START YOUR BATTLE
            </Button>
          </div>
          
          {/* Placeholder for Screenshots */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="aspect-square bg-gradient-to-br from-surface to-card rounded-xl retro-border flex items-center justify-center">
              <div className="text-center space-y-2">
                <CustomIcon name="target" fallback="🎯" alt="Pick Teams" size="lg" />
                <p className="text-sm font-medium">Pick Teams</p>
                <p className="text-xs text-muted-foreground">Screenshot placeholder</p>
              </div>
            </div>
            <div className="aspect-square bg-gradient-to-br from-surface to-card rounded-xl retro-border flex items-center justify-center">
              <div className="text-center space-y-2">
                <CustomIcon name="trophy" fallback="🏆" alt="League Standings" size="lg" />
                <p className="text-sm font-medium">League Standings</p>
                <p className="text-xs text-muted-foreground">Screenshot placeholder</p>
              </div>
            </div>
            <div className="aspect-square bg-gradient-to-br from-surface to-card rounded-xl retro-border flex items-center justify-center sm:col-span-2 lg:col-span-1">
              <div className="text-center space-y-2">
                <CustomIcon name="fire" fallback="🔥" alt="Live Action" size="lg" />
                <p className="text-sm font-medium">Live Action</p>
                <p className="text-xs text-muted-foreground">Screenshot placeholder</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tutorial Wizard */}
      <TutorialWizard
        isOpen={showTutorial}
        onClose={handleTutorialComplete}
        playerName={newUserName}
      />
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <CustomIcon name="hourglass" fallback="⏰" alt="Loading" size="xl" />
          <p className="text-muted-foreground mt-4">Loading...</p>
        </div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  )
}