const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://cggoycedsybrajvdqjjk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
);

async function analyzeWeek8() {
  console.log('='.repeat(80));
  console.log('📊 WEEK 8 WRAP REPORT');
  console.log('='.repeat(80));

  // Get the league (assuming The Gridiron Gamble 2025)
  const { data: league } = await supabase
    .from('leagues')
    .select('*')
    .eq('slug', 'the-gridiron-gamble-2025')
    .single();

  console.log(`\nLeague: ${league.name}`);
  console.log(`League ID: ${league.id}\n`);

  // Get all Week 8 games
  const { data: games } = await supabase
    .from('games')
    .select(`
      *,
      home_team:teams!games_home_team_id_fkey(team_id, key, city, name),
      away_team:teams!games_away_team_id_fkey(team_id, key, city, name)
    `)
    .eq('season_year', 2025)
    .eq('week', 8)
    .order('game_time');

  console.log('='.repeat(80));
  console.log('🏈 WEEK 8 GAMES STATUS');
  console.log('='.repeat(80));

  let finalCount = 0;
  let inProgressCount = 0;

  games.forEach((g, i) => {
    const status = g.is_final ? 'FINAL' : 'NOT FINAL';
    const score = g.is_final ? `${g.away_score}-${g.home_score}` : 'TBD';
    console.log(`${(i+1).toString().padStart(2)}. ${g.away_team.key} @ ${g.home_team.key}: ${score.padEnd(6)} ${status}`);

    if (g.is_final) finalCount++;
    else inProgressCount++;
  });

  console.log(`\nGames Final: ${finalCount}/${games.length}`);
  console.log(`Games Remaining: ${inProgressCount}/${games.length}`);

  if (inProgressCount > 0) {
    console.log(`\n⚠️  WARNING: Week 8 has ${inProgressCount} games that are not marked as final!`);
  }

  // Get all league members
  const { data: members } = await supabase
    .from('league_members')
    .select(`
      *,
      users(id, username, display_name)
    `)
    .eq('league_id', league.id);

  // Get all Week 8 picks
  const { data: picks } = await supabase
    .from('picks')
    .select(`
      *,
      users(id, username, display_name),
      teams(team_id, key, city, name),
      games(
        id,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        is_final,
        home_team:teams!games_home_team_id_fkey(key),
        away_team:teams!games_away_team_id_fkey(key)
      )
    `)
    .eq('league_id', league.id)
    .eq('week', 8);

  console.log('\n' + '='.repeat(80));
  console.log('🎯 WEEK 8 PICKS & RESULTS');
  console.log('='.repeat(80));

  const pickResults = [];
  const membersWithPicks = new Set();

  picks.forEach(pick => {
    membersWithPicks.add(pick.user_id);

    const game = pick.games;
    const pickedTeam = pick.teams;
    const isHome = pickedTeam.team_id === game.home_team_id;
    const isAway = pickedTeam.team_id === game.away_team_id;

    let result = 'PENDING';
    let isCorrect = null;

    if (game.is_final) {
      const homeWon = game.home_score > game.away_score;
      const awayWon = game.away_score > game.home_score;

      if (isHome && homeWon) {
        result = 'WIN ✓';
        isCorrect = true;
      } else if (isAway && awayWon) {
        result = 'WIN ✓';
        isCorrect = true;
      } else {
        result = 'LOSS ✗';
        isCorrect = false;
      }
    }

    pickResults.push({
      userId: pick.user_id,
      username: pick.users.username,
      displayName: pick.users.display_name,
      pickedTeam: pickedTeam.key,
      game: `${game.away_team.key} @ ${game.home_team.key}`,
      score: game.is_final ? `${game.away_score}-${game.home_score}` : 'TBD',
      result,
      isCorrect,
      dbIsCorrect: pick.is_correct
    });
  });

  // Sort by result (losses first, then wins, then pending)
  pickResults.sort((a, b) => {
    if (a.result.includes('LOSS') && !b.result.includes('LOSS')) return -1;
    if (!a.result.includes('LOSS') && b.result.includes('LOSS')) return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  pickResults.forEach(pr => {
    const dbMatch = pr.isCorrect === pr.dbIsCorrect ? '' : ' ⚠️ DB MISMATCH';
    console.log(`${pr.displayName.padEnd(25)} ${pr.pickedTeam.padEnd(4)} (${pr.game}) ${pr.score.padEnd(8)} ${pr.result}${dbMatch}`);
  });

  // Get members without picks
  const membersWithoutPicks = members.filter(m =>
    !m.is_eliminated && !membersWithPicks.has(m.users.id)
  );

  if (membersWithoutPicks.length > 0) {
    console.log('\n⚠️  MEMBERS WITHOUT PICKS:');
    membersWithoutPicks.forEach(m => {
      console.log(`  - ${m.users.display_name} (${m.users.username})`);
    });
  }

  // Calculate expected lives
  console.log('\n' + '='.repeat(80));
  console.log('💚 LIVES & ELIMINATIONS ANALYSIS');
  console.log('='.repeat(80));

  const livesSummary = [];

  for (const member of members) {
    const pick = picks.find(p => p.user_id === member.users.id);
    const currentLives = member.lives_remaining;
    const isEliminated = member.is_eliminated;

    let expectedLives = currentLives;
    let shouldBeEliminated = isEliminated;
    let action = 'No change';

    if (!pick && !isEliminated) {
      // No pick = automatic loss
      expectedLives = Math.max(0, currentLives - 1);
      shouldBeEliminated = expectedLives === 0;
      action = 'Should lose 1 life (no pick)';
    } else if (pick) {
      const game = pick.games;

      if (game.is_final) {
        const pickedTeam = pick.teams;
        const isHome = pickedTeam.team_id === game.home_team_id;
        const homeWon = game.home_score > game.away_score;
        const awayWon = game.away_score > game.home_score;

        const won = (isHome && homeWon) || (!isHome && awayWon);

        if (!won && !isEliminated) {
          expectedLives = Math.max(0, currentLives - 1);
          shouldBeEliminated = expectedLives === 0;
          action = 'Should lose 1 life (wrong pick)';
        }
      }
    }

    const status = currentLives !== expectedLives ? '⚠️ NEEDS UPDATE' : '✓ OK';

    livesSummary.push({
      displayName: member.users.display_name,
      username: member.users.username,
      currentLives,
      expectedLives,
      isEliminated,
      shouldBeEliminated,
      action,
      status
    });
  }

  // Sort: issues first, then by lives
  livesSummary.sort((a, b) => {
    if (a.status.includes('NEEDS') && !b.status.includes('NEEDS')) return -1;
    if (!a.status.includes('NEEDS') && b.status.includes('NEEDS')) return 1;
    if (a.isEliminated && !b.isEliminated) return 1;
    if (!a.isEliminated && b.isEliminated) return -1;
    return b.currentLives - a.currentLives;
  });

  livesSummary.forEach(ls => {
    const livesStr = `${ls.currentLives} → ${ls.expectedLives}`;
    const elimStr = ls.shouldBeEliminated ? ' [ELIMINATED]' : '';
    console.log(`${ls.displayName.padEnd(25)} Lives: ${livesStr.padEnd(8)} ${ls.status}${elimStr}`);
    if (ls.action !== 'No change') {
      console.log(`  → ${ls.action}`);
    }
  });

  // Get Week 9 picks to verify they're safe
  const { data: week9Picks } = await supabase
    .from('picks')
    .select(`
      id,
      users(username, display_name),
      teams(key)
    `)
    .eq('league_id', league.id)
    .eq('week', 9);

  console.log('\n' + '='.repeat(80));
  console.log('🔒 WEEK 9 PICKS (DO NOT MODIFY)');
  console.log('='.repeat(80));
  console.log(`Total Week 9 picks: ${week9Picks?.length || 0}\n`);

  if (week9Picks && week9Picks.length > 0) {
    week9Picks.forEach(p => {
      console.log(`  ✓ ${p.users.display_name.padEnd(25)} picked ${p.teams.key}`);
    });
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📋 SUMMARY');
  console.log('='.repeat(80));

  const correctPicks = pickResults.filter(pr => pr.result.includes('WIN')).length;
  const incorrectPicks = pickResults.filter(pr => pr.result.includes('LOSS')).length;
  const pendingPicks = pickResults.filter(pr => pr.result === 'PENDING').length;
  const needsUpdate = livesSummary.filter(ls => ls.status.includes('NEEDS')).length;

  console.log(`Total members: ${members.length}`);
  console.log(`Week 8 picks submitted: ${picks.length}`);
  console.log(`No pick submitted: ${membersWithoutPicks.length}`);
  console.log(`Correct picks: ${correctPicks}`);
  console.log(`Incorrect picks: ${incorrectPicks}`);
  console.log(`Pending results: ${pendingPicks}`);
  console.log(`Lives that need updating: ${needsUpdate}`);
  console.log(`Week 9 picks: ${week9Picks?.length || 0}`);

  if (needsUpdate > 0) {
    console.log(`\n⚠️  ACTION REQUIRED: ${needsUpdate} member(s) need life adjustments!`);
  } else if (pendingPicks > 0) {
    console.log(`\n⏳ Week 8 is not complete yet (${pendingPicks} pending results)`);
  } else {
    console.log(`\n✅ Week 8 is complete and all lives are correct!`);
  }
}

analyzeWeek8().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
