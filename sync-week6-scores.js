require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function syncWeek6Scores() {
  console.log('🏈 Syncing Week 6 Scores from ESPN...\n')
  console.log('=' .repeat(80))

  // 1. Fetch current scoreboard from ESPN
  console.log('\n📡 Fetching from ESPN API...')
  const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard', {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; PickemParty/2.0)'
    }
  })

  if (!response.ok) {
    console.error('❌ ESPN API error:', response.status)
    return
  }

  const data = await response.json()
  const events = data.events || []

  console.log(`✅ Found ${events.length} games from ESPN\n`)

  // 2. Get team mappings
  const { data: teams } = await supabase.from('teams').select('*')
  const teamMap = new Map()
  teams?.forEach(team => {
    teamMap.set(team.key, team.team_id)
  })

  let updatedGames = 0
  let completedGames = []
  let liveGames = []
  let scheduledGames = []

  // 3. Process each game
  for (const event of events) {
    const competition = event.competitions?.[0]
    if (!competition) continue

    const homeCompetitor = competition.competitors.find(c => c.homeAway === 'home')
    const awayCompetitor = competition.competitors.find(c => c.homeAway === 'away')

    if (!homeCompetitor || !awayCompetitor) continue

    const homeTeamKey = homeCompetitor.team.abbreviation
    const awayTeamKey = awayCompetitor.team.abbreviation
    const homeTeamId = teamMap.get(homeTeamKey)
    const awayTeamId = teamMap.get(awayTeamKey)

    if (!homeTeamId || !awayTeamId) {
      console.log(`⚠️  Skipping: Unknown teams ${awayTeamKey} @ ${homeTeamKey}`)
      continue
    }

    // Determine game status
    const status = event.status || competition.status
    const isLive = status.type.state === 'in' || status.type.name.includes('STATUS_IN_PROGRESS') || status.type.name.includes('HALFTIME')
    const isCompleted = status.type.completed || status.type.state === 'post'

    const homeScore = parseInt(homeCompetitor.score || '0')
    const awayScore = parseInt(awayCompetitor.score || '0')

    const gameInfo = {
      away: `${awayTeamKey}`,
      home: `${homeTeamKey}`,
      awayScore,
      homeScore,
      status: status.type.description,
      isCompleted,
      isLive,
      homeTeamId,
      awayTeamId
    }

    if (isCompleted) {
      completedGames.push(gameInfo)
    } else if (isLive) {
      liveGames.push(gameInfo)
    } else {
      scheduledGames.push(gameInfo)
    }

    // Find the game in our database
    const { data: existingGame } = await supabase
      .from('games')
      .select('id, home_score, away_score, is_final, week')
      .eq('home_team_id', homeTeamId)
      .eq('away_team_id', awayTeamId)
      .eq('season_year', 2025)
      .single()

    if (!existingGame) {
      continue
    }

    // Update game
    const { error: updateError } = await supabase
      .from('games')
      .update({
        home_score: homeScore,
        away_score: awayScore,
        is_final: isCompleted,
        game_status: status.type.description,
        last_updated: new Date().toISOString()
      })
      .eq('id', existingGame.id)

    if (updateError) {
      console.error(`❌ Failed to update game:`, updateError)
    } else {
      updatedGames++

      // If game just completed, update picks
      if (isCompleted && !existingGame.is_final) {
        await updatePickResults(existingGame.id, existingGame.week, homeTeamId, awayTeamId, homeScore, awayScore, awayTeamKey, homeTeamKey)
      }
    }
  }

  // 4. Display summary
  console.log('\n' + '='.repeat(80))
  console.log('\n📊 SCORE SYNC SUMMARY\n')
  console.log(`Total games processed: ${events.length}`)
  console.log(`Games updated: ${updatedGames}`)
  console.log(`✅ Completed: ${completedGames.length}`)
  console.log(`🟢 Live: ${liveGames.length}`)
  console.log(`⏳ Scheduled: ${scheduledGames.length}`)

  if (completedGames.length > 0) {
    console.log('\n✅ COMPLETED GAMES:')
    completedGames.forEach(g => {
      const winner = g.awayScore > g.homeScore ? g.away : g.home
      console.log(`   FINAL: ${g.away} ${g.awayScore} @ ${g.home} ${g.homeScore} (Winner: ${winner})`)
    })
  }

  if (liveGames.length > 0) {
    console.log('\n🟢 LIVE GAMES:')
    liveGames.forEach(g => {
      console.log(`   LIVE: ${g.away} ${g.awayScore} @ ${g.home} ${g.homeScore} - ${g.status}`)
    })
  }

  if (scheduledGames.length > 0) {
    console.log('\n⏳ SCHEDULED GAMES:')
    scheduledGames.forEach(g => {
      console.log(`   ${g.status}: ${g.away} @ ${g.home}`)
    })
  }

  console.log('\n' + '='.repeat(80))
  console.log('\n🎉 Sync complete!\n')
}

async function updatePickResults(gameId, week, homeTeamId, awayTeamId, homeScore, awayScore, awayKey, homeKey) {
  try {
    const winningTeamId = homeScore > awayScore ? homeTeamId : awayTeamId
    const winnerName = homeScore > awayScore ? homeKey : awayKey

    console.log(`\n   📋 Processing picks for Week ${week} game...`)

    // Get all picks for this game
    const { data: gamePicks, error: fetchError } = await supabase
      .from('picks')
      .select(`
        id,
        team_id,
        user:users(display_name),
        picked_team:teams!picks_team_id_fkey(city, name)
      `)
      .eq('game_id', gameId)

    if (fetchError) {
      console.error(`   ❌ Failed to fetch picks:`, fetchError)
      return
    }

    if (!gamePicks || gamePicks.length === 0) {
      console.log(`   ℹ️  No picks found for this game`)
      return
    }

    console.log(`   Found ${gamePicks.length} pick(s) for this game`)

    // Update each pick's correctness
    for (const pick of gamePicks) {
      const isCorrect = pick.team_id === winningTeamId

      const { error: updateError } = await supabase
        .from('picks')
        .update({ is_correct: isCorrect })
        .eq('id', pick.id)

      if (updateError) {
        console.error(`   ❌ Failed to update pick:`, updateError)
      } else {
        const result = isCorrect ? '✅ CORRECT' : '❌ INCORRECT'
        console.log(`      ${result}: ${pick.user.display_name} picked ${pick.picked_team.city} ${pick.picked_team.name}`)
      }
    }

    console.log(`   ✅ Picks updated - Winner: ${winnerName}`)

  } catch (error) {
    console.error(`   ❌ Error updating picks:`, error)
  }
}

syncWeek6Scores().catch(console.error)
