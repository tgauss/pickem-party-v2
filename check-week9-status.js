const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://cggoycedsybrajvdqjjk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
);

const LEAGUE_ID = 'ce87e7df-2aa1-460e-b48f-0f2c0a905643'; // The Gridiron Gamble 2025

async function checkWeek9() {
  console.log('📊 CHECKING WEEK 9 STATUS\n');

  // Check games
  const { data: games } = await supabase
    .from('games')
    .select('*, home_team:teams!games_home_team_id_fkey(key, name), away_team:teams!games_away_team_id_fkey(key, name)')
    .eq('week', 9)
    .eq('season_year', 2025)
    .order('start_time');

  console.log('Week 9 Games:');
  console.log('='.repeat(80));
  if (games && games.length > 0) {
    games.forEach(g => {
      const status = g.is_final ? '✅ FINAL' : (g.home_score > 0 || g.away_score > 0 ? '🏃 IN PROGRESS' : '⏳ UPCOMING');
      console.log(`${g.away_team.key} @ ${g.home_team.key}: ${g.away_score}-${g.home_score} ${status}`);
    });
    console.log(`\nTotal: ${games.length} games`);
    console.log(`Final: ${games.filter(g => g.is_final).length}`);
    console.log(`In Progress/Upcoming: ${games.filter(g => !g.is_final).length}`);
  } else {
    console.log('No Week 9 games found!');
  }

  // Check picks
  const { data: picks } = await supabase
    .from('picks')
    .select('*, users(username, display_name), teams(key, name)')
    .eq('week', 9)
    .eq('league_id', LEAGUE_ID);

  console.log('\n\nWeek 9 Picks:');
  console.log('='.repeat(80));
  if (picks && picks.length > 0) {
    picks.forEach(p => {
      const status = p.is_correct !== null ? (p.is_correct ? '✅ WIN' : '❌ LOSS') : '⏳ PENDING';
      console.log(`${p.users.display_name.padEnd(25)} picked ${p.teams.key.padEnd(4)} ${status}`);
    });
    console.log(`\nTotal picks: ${picks.length}`);
    console.log(`Processed: ${picks.filter(p => p.is_correct !== null).length}`);
    console.log(`Pending: ${picks.filter(p => p.is_correct === null).length}`);
  } else {
    console.log('No Week 9 picks found!');
  }

  // Check league members status
  const { data: members } = await supabase
    .from('league_members')
    .select('*, users(display_name)')
    .eq('league_id', LEAGUE_ID)
    .order('lives_remaining', { ascending: false });

  console.log('\n\nCurrent League Status (Before Week 9 Processing):');
  console.log('='.repeat(80));
  if (members) {
    const alive = members.filter(m => !m.is_eliminated);
    const eliminated = members.filter(m => m.is_eliminated);

    console.log(`Alive: ${alive.length}`);
    alive.forEach(m => {
      console.log(`  ${m.users.display_name.padEnd(25)} ${m.lives_remaining} ${m.lives_remaining === 1 ? 'life' : 'lives'}`);
    });

    console.log(`\nEliminated: ${eliminated.length}`);
    eliminated.forEach(m => {
      console.log(`  ${m.users.display_name.padEnd(25)} Week ${m.eliminated_week || 'N/A'}`);
    });
  }
}

checkWeek9().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
