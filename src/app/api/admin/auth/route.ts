import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { username, password } = await request.json()
  
  const adminUsername = process.env.SUPER_ADMIN_USERNAME
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD
  
  if (username === adminUsername && password === adminPassword) {
    return NextResponse.json({ success: true })
  }
  
  return NextResponse.json({ success: false }, { status: 401 })
}