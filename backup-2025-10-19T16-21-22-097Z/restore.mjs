import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://cggoycedsybrajvdqjjk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
const supabase = createClient(supabaseUrl, supabaseKey)

async function restore() {
  console.log('🔄 RESTORING FROM BACKUP\n')

  const games = JSON.parse(fs.readFileSync('games-backup.json', 'utf8'))
  const picks = JSON.parse(fs.readFileSync('picks-backup.json', 'utf8'))

  console.log(`Restoring ${games.length} games and ${picks.length} picks...\n`)

  // Delete current data
  console.log('🗑️  Deleting current picks...')
  await supabase.from('picks').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  console.log('🗑️  Deleting current games...')
  await supabase.from('games').delete().eq('season_year', 2025)

  // Restore games
  console.log('📦 Restoring games...')
  const { error: gamesError } = await supabase.from('games').insert(games)
  if (gamesError) {
    console.error('Error restoring games:', gamesError)
    return
  }

  // Restore picks
  console.log('📦 Restoring picks...')
  const { error: picksError } = await supabase.from('picks').insert(picks)
  if (picksError) {
    console.error('Error restoring picks:', picksError)
    return
  }

  console.log('\n✅ RESTORE COMPLETE!')
}

restore().catch(console.error)
