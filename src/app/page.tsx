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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="username">Fighter Name</Label>
            <Input
              id="username"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-surface border-border min-h-[44px] text-base"
            />
          </div>

          {!isLogin && (
            <>
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  placeholder="What they'll call you"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-surface border-border min-h-[44px] text-base"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
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
            <Label htmlFor="pin">PIN (Optional)</Label>
            <Input
              id="pin"
              type="number"
              placeholder="4-digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value.slice(0, 4))}
              className="bg-surface border-border min-h-[44px] text-base"
            />
          </div>

          <Button 
            onClick={handleAuth}
            disabled={loading || !username || (!isLogin && (!displayName || !email))}
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
