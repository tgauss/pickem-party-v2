const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://cggoycedsybrajvdqjjk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
);

const LEAGUE_ID = 'ce87e7df-2aa1-460e-b48f-0f2c0a905643';

async function deepCheckWeek9() {
  console.log('🔍 DEEP DIVE INTO WEEK 9\n');

  // Check all games in database
  const { data: allGames } = await supabase
    .from('games')
    .select('season_year, week, count')
    .eq('season_year', 2025);

  console.log('Games by week in 2025:');
  console.log('='.repeat(80));

  const weekCounts = {};
  if (allGames) {
    allGames.forEach(g => {
      weekCounts[g.week] = (weekCounts[g.week] || 0) + 1;
    });

    for (let week = 1; week <= 18; week++) {
      console.log(`Week ${week}: ${weekCounts[week] || 0} games`);
    }
  }

  // Check the actual Week 9 picks with their game references
  const { data: picks } = await supabase
    .from('picks')
    .select(`
      *,
      users(username, display_name),
      teams(key, city, name),
      games(
        id,
        week,
        season_year,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        is_final,
        start_time,
        home_team:teams!games_home_team_id_fkey(key, name),
        away_team:teams!games_away_team_id_fkey(key, name)
      )
    `)
    .eq('week', 9)
    .eq('league_id', LEAGUE_ID);

  console.log('\n\nWeek 9 Picks with Game Details:');
  console.log('='.repeat(80));
  if (picks && picks.length > 0) {
    picks.forEach(p => {
      const game = p.games;
      const status = p.is_correct !== null ? (p.is_correct ? '✅ WIN' : '❌ LOSS') : '⏳ PENDING';

      if (game) {
        console.log(`\n${p.users.display_name}:`);
        console.log(`  Picked: ${p.teams.key}`);
        console.log(`  Game: ${game.away_team.key} @ ${game.home_team.key} (Week ${game.week})`);
        console.log(`  Score: ${game.away_score} - ${game.home_score}`);
        console.log(`  Final: ${game.is_final}`);
        console.log(`  Result: ${status}`);
        console.log(`  Game ID: ${game.id}`);
      } else {
        console.log(`\n${p.users.display_name}: Picked ${p.teams.key} - NO GAME FOUND! ${status}`);
      }
    });
  }

  // Check if there are any members who should have made picks but didn't
  const { data: members } = await supabase
    .from('league_members')
    .select('*, users(display_name)')
    .eq('league_id', LEAGUE_ID)
    .eq('is_eliminated', false);

  console.log('\n\nAlive Members vs Week 9 Picks:');
  console.log('='.repeat(80));
  console.log(`Total alive members: ${members?.length || 0}`);
  console.log(`Total Week 9 picks: ${picks?.length || 0}`);

  if (members && picks) {
    const memberIds = members.map(m => m.user_id);
    const pickerIds = picks.map(p => p.user_id);

    const missingPicks = members.filter(m => !pickerIds.includes(m.user_id));

    if (missingPicks.length > 0) {
      console.log(`\n⚠️  Members without Week 9 picks (should be eliminated?):`);
      missingPicks.forEach(m => {
        console.log(`  - ${m.users.display_name} (${m.lives_remaining} ${m.lives_remaining === 1 ? 'life' : 'lives'})`);
      });
    } else {
      console.log('\n✅ All alive members have Week 9 picks');
    }
  }

  // Check league settings for current week
  const { data: league } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', LEAGUE_ID)
    .single();

  if (league) {
    console.log('\n\nLeague Settings:');
    console.log('='.repeat(80));
    console.log(`Name: ${league.name}`);
    console.log(`Force Current Week: ${league.force_current_week || 'Not set'}`);
    console.log(`Picks Revealed Weeks: ${league.picks_revealed_weeks?.join(', ') || 'None'}`);
  }
}

deepCheckWeek9().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
