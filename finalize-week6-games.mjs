// Mark all Week 6 games as STATUS_FINAL
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function finalizeWeek6Games() {
  console.log('🏁 FINALIZING ALL WEEK 6 GAMES...\n')

  // Update all Week 6 games to STATUS_FINAL
  const { data, error } = await supabase
    .from('games')
    .update({ status: 'STATUS_FINAL' })
    .eq('season_year', 2025)
    .eq('week', 6)
    .select()

  if (error) {
    console.error('❌ Error updating games:', error)
    process.exit(1)
  }

  console.log(`✅ Updated ${data.length} Week 6 games to STATUS_FINAL`)

  // Verify
  const { data: finalGames, error: verifyError } = await supabase
    .from('games')
    .select('*')
    .eq('season_year', 2025)
    .eq('week', 6)
    .eq('status', 'STATUS_FINAL')

  if (verifyError) {
    console.error('❌ Error verifying:', verifyError)
    process.exit(1)
  }

  console.log(`✅ Verified: ${finalGames.length} games are now final`)
  console.log('\n✨ Week 6 is now completely settled!')
}

finalizeWeek6Games()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
