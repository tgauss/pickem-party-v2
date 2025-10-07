'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LogoutPage() {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [loggedOut, setLoggedOut] = useState(false)

  useEffect(() => {
    // Check if user is logged in
    const currentUser = localStorage.getItem('currentUser')
    if (!currentUser) {
      // Already logged out, redirect to home
      router.push('/')
    }
  }, [router])

  const handleLogout = () => {
    setIsLoggingOut(true)

    // Clear all authentication data from localStorage
    localStorage.removeItem('currentUser')

    // Optional: Clear any other app-specific data
    // localStorage.removeItem('lastLeagueVisited')
    // sessionStorage.clear()

    setTimeout(() => {
      setIsLoggingOut(false)
      setLoggedOut(true)

      // Redirect to home after 2 seconds
      setTimeout(() => {
        router.push('/')
      }, 2000)
    }, 500)
  }

  const handleCancel = () => {
    router.back()
  }

  if (loggedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="text-6xl mb-4">👋</div>
            <CardTitle className="text-2xl">Logged Out Successfully</CardTitle>
            <CardDescription>
              You have been logged out. Redirecting to home page...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-6xl mb-4">🚪</div>
          <CardTitle className="text-2xl">Log Out</CardTitle>
          <CardDescription>
            Are you sure you want to log out? You&apos;ll need to sign in again to access your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full"
            variant="destructive"
            size="lg"
          >
            {isLoggingOut ? 'Logging Out...' : 'Yes, Log Me Out'}
          </Button>
          <Button
            onClick={handleCancel}
            disabled={isLoggingOut}
            className="w-full"
            variant="outline"
            size="lg"
          >
            Cancel
          </Button>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              💡 <strong>Tip:</strong> Logging out only affects this device. Other devices will remain logged in.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
