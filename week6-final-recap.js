require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function generateWeek6FinalRecap() {
  console.log('\n')
  console.log('=' .repeat(80))
  console.log('🏈 WEEK 6 FINAL RECAP - THE GRIDIRON GAMBLE 2025')
  console.log('=' .repeat(80))
  console.log('\n')

  // Get all picks
  const { data: picks } = await supabase
    .from('picks')
    .select(`
      *,
      user:users(id, display_name),
      picked_team:teams!picks_team_id_fkey(city, name),
      game:games(
        home_score,
        away_score,
        home_team:teams!games_home_team_id_fkey(city, name),
        away_team:teams!games_away_team_id_fkey(city, name)
      )
    `)
    .eq('week', 6)

  const correctPicks = picks?.filter(p => p.is_correct === true) || []
  const incorrectPicks = picks?.filter(p => p.is_correct === false) || []

  // Get league members
  const { data: members } = await supabase
    .from('league_members')
    .select(`
      *,
      user:users(id, display_name)
    `)

  console.log('📊 WEEK 6 STATISTICS')
  console.log('-'.repeat(80))
  console.log(`Total Active Members: ${members?.filter(m => !m.is_eliminated).length || 0}`)
  console.log(`Total Picks Submitted: ${picks?.length || 0}`)
  console.log(`✅ Correct Picks: ${correctPicks.length} (${((correctPicks.length / picks.length) * 100).toFixed(1)}%)`)
  console.log(`❌ Incorrect Picks: ${incorrectPicks.length} (${((incorrectPicks.length / picks.length) * 100).toFixed(1)}%)`)
  console.log('\n')

  // WINNERS
  if (correctPicks.length > 0) {
    console.log('✅ SURVIVORS (16 players live another week!)')
    console.log('-'.repeat(80))

    // Group by team
    const picksByTeam = {}
    correctPicks.forEach(pick => {
      const teamName = pick.picked_team.name
      if (!picksByTeam[teamName]) {
        picksByTeam[teamName] = []
      }
      picksByTeam[teamName].push(pick)
    })

    Object.entries(picksByTeam).forEach(([teamName, teamPicks]) => {
      const firstPick = teamPicks[0]
      const game = firstPick.game
      console.log(`\n🏆 ${firstPick.picked_team.city} ${teamName} (${teamPicks.length} players)`)
      console.log(`   Final: ${game.away_team.city} ${game.away_score} @ ${game.home_team.city} ${game.home_score}`)
      teamPicks.forEach(pick => {
        console.log(`   ✅ ${pick.user.display_name}`)
      })
    })
    console.log('\n')
  }

  // LOSERS
  if (incorrectPicks.length > 0) {
    console.log('❌ CASUALTIES (Lost a life this week)')
    console.log('-'.repeat(80))

    for (const pick of incorrectPicks) {
      const game = pick.game
      const member = members?.find(m => m.user.id === pick.user.id)

      console.log(`\n💀 ${pick.user.display_name}`)
      console.log(`   Picked: ${pick.picked_team.city} ${pick.picked_team.name}`)
      console.log(`   Result: ${game.away_team.city} ${game.away_score} @ ${game.home_team.city} ${game.home_score}`)
      console.log(`   Lives Before: ${member?.lives_remaining || 0}`)

      // Deduct life
      if (member && member.lives_remaining > 0) {
        const newLives = member.lives_remaining - 1
        const isEliminated = newLives === 0

        const { error: updateError } = await supabase
          .from('league_members')
          .update({
            lives_remaining: newLives,
            is_eliminated: isEliminated,
            eliminated_week: isEliminated ? 6 : null
          })
          .eq('id', member.id)

        if (updateError) {
          console.log(`   ⚠️  Error updating lives: ${updateError.message}`)
        } else {
          console.log(`   Lives After: ${newLives}`)
          if (isEliminated) {
            console.log(`   💀💀💀 ELIMINATED FROM THE GRIDIRON GAMBLE 💀💀💀`)
          } else {
            console.log(`   ⚠️  Down to ${newLives} life remaining!`)
          }
        }
      }
    }
    console.log('\n')
  }

  // UPDATED STANDINGS
  console.log('\n')
  console.log('📊 UPDATED STANDINGS AFTER WEEK 6')
  console.log('-'.repeat(80))

  const { data: updatedMembers } = await supabase
    .from('league_members')
    .select(`
      *,
      user:users(display_name)
    `)
    .order('lives_remaining', { ascending: false })
    .order('joined_at', { ascending: true })

  const alive = updatedMembers?.filter(m => !m.is_eliminated) || []
  const eliminated = updatedMembers?.filter(m => m.is_eliminated) || []

  console.log(`\n🟢 ALIVE (${alive.length} players)`)

  const twoLives = alive.filter(m => m.lives_remaining === 2)
  const oneLife = alive.filter(m => m.lives_remaining === 1)

  if (twoLives.length > 0) {
    console.log(`\n   💚💚 2 Lives (${twoLives.length} players):`)
    twoLives.forEach((m, idx) => {
      console.log(`   ${idx + 1}. ${m.user.display_name}`)
    })
  }

  if (oneLife.length > 0) {
    console.log(`\n   💚 1 Life (${oneLife.length} players - DANGER ZONE!):`)
    oneLife.forEach((m, idx) => {
      console.log(`   ${twoLives.length + idx + 1}. ${m.user.display_name}`)
    })
  }

  if (eliminated.length > 0) {
    console.log(`\n💀 ELIMINATED (${eliminated.length} players)`)
    eliminated.forEach((m, idx) => {
      console.log(`   ${alive.length + idx + 1}. ${m.user.display_name} (Week ${m.eliminated_week || '?'})`)
    })
  }

  // KEY MOMENTS
  console.log('\n\n')
  console.log('🎯 KEY MOMENTS FROM WEEK 6')
  console.log('-'.repeat(80))
  console.log('• Monday Night Thriller: Chicago Bears 25 @ Washington Commanders 24')
  console.log('  Keegan McAdam picked the Commanders in a nail-biter!')
  console.log('• Most Popular Pick: Green Bay Packers (9 players) ✅')
  console.log('• Overall Success Rate: 94.1% (16 of 17 picks correct)')
  console.log('• Perfect Week Rate: 94.1% of active players survived')

  console.log('\n\n')
  console.log('=' .repeat(80))
  console.log('Week 6 Complete! On to Week 7! 🏈')
  console.log('=' .repeat(80))
  console.log('\n')
}

generateWeek6FinalRecap().catch(console.error)
