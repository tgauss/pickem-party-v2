'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LogIn, UserPlus, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  // Check if user is already logged in
  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser')
    if (currentUser) {
      window.location.href = '/dashboard'
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    if (!username.trim()) {
      setError('Please enter your username')
      setLoading(false)
      return
    }
    
    // Simple login - just check if user exists
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.toLowerCase().trim())
      .single()
      
    if (user) {
      // Store user in localStorage for MVP (no secure sessions needed)
      localStorage.setItem('currentUser', JSON.stringify(user))
      window.location.href = '/dashboard'
    } else {
      setError('Username not found! Make sure you entered it correctly, or sign up if you&apos;re new.')
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] pointer-events-none"></div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Back to Home Link */}
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader className="text-center pb-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-2 bg-primary/20 rounded-lg">
                <LogIn className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl text-white">
                Welcome Back!
              </CardTitle>
            </div>
            <p className="text-white/70">
              Sign in to your Pickem Party account
            </p>
          </CardHeader>
          
          <CardContent>
            {error && (
              <Alert className="mb-4 bg-red-900/20 border-red-500/20 text-red-300">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="username" className="text-white/90 font-medium">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-primary/50 min-h-[44px]"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  disabled={loading}
                  required
                />
              </div>

              <Button 
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 min-h-[44px]"
                disabled={loading}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="text-center">
                <p className="text-white/70 mb-3">
                  Don&apos;t have an account yet?
                </p>
                <Link href="/">
                  <Button 
                    variant="outline" 
                    className="w-full bg-transparent border-white/20 text-white hover:bg-white/10 min-h-[44px]"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create New Account
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-white/50 text-sm">
            Simple username-based login • No passwords needed
          </p>
        </div>
      </div>
    </div>
  )
}