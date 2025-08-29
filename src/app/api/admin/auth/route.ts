import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { username, password } = await request.json()
  
  const adminUsername = process.env.SUPER_ADMIN_USERNAME
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD
  
  // Debug logging (remove in production)
  console.log('Admin auth attempt:', { 
    providedUsername: username,
    expectedUsername: adminUsername,
    hasPassword: !!password,
    hasExpectedPassword: !!adminPassword,
    envVarsLoaded: !!(adminUsername && adminPassword)
  })
  
  if (username === adminUsername && password === adminPassword) {
    return NextResponse.json({ success: true })
  }
  
  return NextResponse.json({ success: false }, { status: 401 })
}