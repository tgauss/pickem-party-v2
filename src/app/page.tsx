'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import Image from 'next/image'

export default function HomePage() {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [isLogin, setIsLogin] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

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
          pin_hash: pin ? pin : null // Store PIN directly for MVP simplicity
        })
        .select()
        .single()
        
      if (data) {
        localStorage.setItem('currentUser', JSON.stringify(data))
        window.location.href = '/dashboard'
      } else {
        alert('Sign up failed: ' + (error?.message || 'Unknown error'))
      }
    }
    setLoading(false)
  }

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
                />
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
            disabled={loading || !username || !pin || (!isLogin && (!displayName || !email))}
            className="w-full fight-text"
            style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-foreground)'
            }}
          >
            {loading ? '...' : isLogin ? 'FIGHT!' : 'ENTER ARENA!'}
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsLogin(!isLogin)}
            className="w-full"
          >
            {isLogin ? 'New Fighter? Sign Up' : 'Returning Fighter? Login'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
