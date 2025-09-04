import { NextResponse } from 'next/server'
import { readdir } from 'fs/promises'
import { join } from 'path'

export async function GET() {
  try {
    const musicDir = join(process.cwd(), 'public', 'music')
    
    try {
      const files = await readdir(musicDir)
      const mp3Files = files.filter(file => 
        file.toLowerCase().endsWith('.mp3')
      ).map(file => `/music/${file}`)
      
      return NextResponse.json({ success: true, files: mp3Files })
    } catch {
      // Directory doesn't exist or can't be read
      return NextResponse.json({ success: true, files: [] })
    }
  } catch (error) {
    console.error('Error reading music directory:', error)
    return NextResponse.json({ success: false, error: 'Failed to read music directory' })
  }
}