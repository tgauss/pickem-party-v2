'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import Image from 'next/image'

export default function AdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAdminLogin = async () => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      
      const result = await response.json()
      
      if (result.success) {
        localStorage.setItem('adminSession', 'true')
        window.location.href = '/admin/dashboard'
      } else {
        alert('❌ ACCESS DENIED')
      }
    } catch {
      alert('❌ CONNECTION ERROR')
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
              alt="Pick&apos;em Party Logo"
              width={96}
              height={96}
              className="mx-auto"
            />
          </div>
          <h1 className="text-2xl font-bold mb-2 fight-text" style={{color: 'var(--destructive)'}}>
            SUPER ADMIN
          </h1>
          <p className="text-muted-foreground">
            RESTRICTED ACCESS
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="username">Admin Username</Label>
            <Input
              id="username"
              placeholder="Enter admin username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-surface border-border min-h-[44px] text-base"
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-surface border-border min-h-[44px] text-base"
            />
          </div>

          <Button 
            onClick={handleAdminLogin}
            disabled={loading || !username || !password}
            className="w-full fight-text"
            style={{
              backgroundColor: 'var(--destructive)',
              color: 'white'
            }}
          >
            {loading ? 'VERIFYING...' : 'ADMIN ACCESS'}
          </Button>

          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
            className="w-full"
          >
            ← Back to Pick&apos;em Party
          </Button>
        </div>
      </Card>
    </div>
  )
}