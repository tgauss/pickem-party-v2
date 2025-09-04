'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Image from 'next/image'

export default function LoginPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  // Check if user is already logged in
  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser')
    if (currentUser) {
      window.location.href = '/dashboard'
    }
  }, [])

  const handleLogin = async () => {
    setLoading(true)
    
    if (!usernameOrEmail.trim() || !pin || pin.length !== 4) {
      alert('Please enter your username/email and 4-digit PIN')
      setLoading(false)
      return
    }
    
    // Check if input is email or username
    const isEmail = usernameOrEmail.includes('@')
    const searchField = isEmail ? 'email' : 'username'
    const searchValue = usernameOrEmail.toLowerCase().trim()
    
    // Simple login - check if user exists and PIN matches
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq(searchField, searchValue)
      .eq('pin_hash', pin)
      .single()
      
    if (user) {
      // Store user in localStorage for MVP (no secure sessions needed)
      localStorage.setItem('currentUser', JSON.stringify(user))
      
      // Check for invite parameter and redirect accordingly
      const urlParams = new URLSearchParams(window.location.search)
      const inviteCode = urlParams.get('invite')
      
      if (inviteCode) {
        // If coming from an invite, redirect back to invite page
        window.location.href = `/?invite=${inviteCode}`
      } else {
        window.location.href = '/dashboard'
      }
    } else {
      alert('Invalid username/email or PIN. Please try again.')
    }
    
    setLoading(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && usernameOrEmail && pin.length === 4) {
      handleLogin()
    }
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: `
          linear-gradient(135deg, #667eea 0%, #764ba2 100%),
          radial-gradient(circle at top left, #f093fb, transparent 50%),
          radial-gradient(circle at bottom right, #f5576c, transparent 50%)
        `,
        backgroundBlendMode: 'normal, screen, screen'
      }}
    >
      <div className="w-full max-w-md">
        <Card className="bg-background border-border shadow-2xl">
          <div className="text-center p-8">
            <div className="mb-4">
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
              ENTER THE ARENA
            </p>
          </div>

          <div className="space-y-4 px-8 pb-8">
            <div>
              <Label htmlFor="usernameOrEmail">
                Username or Email
              </Label>
              <Input
                id="usernameOrEmail"
                placeholder="Enter username or email"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                className="bg-surface border-border min-h-[44px] text-base"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
              />
              <p className="text-xs text-muted-foreground mt-1">
                You can use either your username or email
              </p>
            </div>

            <div>
              <Label htmlFor="pin">
                4-Digit PIN
              </Label>
              <Input
                id="pin"
                type="number"
                placeholder="1234"
                value={pin}
                onChange={(e) => setPin(e.target.value.slice(0, 4))}
                onKeyPress={handleKeyPress}
                className="bg-surface border-border min-h-[44px] text-base"
                autoComplete="current-password"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter your PIN to login
              </p>
            </div>

            <Button 
              onClick={handleLogin}
              disabled={loading || !usernameOrEmail || pin.length !== 4}
              className="w-full fight-text"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)'
              }}
            >
              {loading ? '...' : 'FIGHT!'}
            </Button>

            <div className="text-center space-y-2">
              <Button
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="w-full"
              >
                New Fighter? Sign Up
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => window.location.href = '/'}
                className="w-full text-muted-foreground"
              >
                ← Back to Home
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}