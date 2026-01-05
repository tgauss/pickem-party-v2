const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://cggoycedsybrajvdqjjk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
);

const LEAGUE_ID = 'ce87e7df-2aa1-460e-b48f-0f2c0a905643';

async function checkWeek10() {
  console.log('📊 CHECKING WEEK 10 STATUS\n');

  // Check Week 10 games
  const { data: games } = await supabase
    .from('games')
    .select('*, home_team:teams!games_home_team_id_fkey(key, name), away_team:teams!games_away_team_id_fkey(key, name)')
    .eq('week', 10)
    .eq('season_year', 2025)
    .order('game_time');

  console.log('Week 10 Games:');
  console.log('='.repeat(80));
  if (games && games.length > 0) {
    games.forEach(g => {
      const status = g.is_final ? '✅ FINAL' : (g.home_score > 0 || g.away_score > 0 ? '🏃 IN PROGRESS' : '⏳ UPCOMING');
      console.log(`${g.away_team.key.padEnd(4)} @ ${g.home_team.key.padEnd(4)}: ${g.away_score}-${g.home_score} ${status}`);
    });
    console.log(`\nTotal: ${games.length} games`);
    console.log(`Final: ${games.filter(g => g.is_final).length}`);
    console.log(`In Progress/Upcoming: ${games.filter(g => !g.is_final).length}`);
  } else {
    console.log('No Week 10 games found!');
  }

  // Check Week 10 picks
  const { data: picks } = await supabase
    .from('picks')
    .select(`
      *,
      users(username, display_name),
      teams(key, name),
      games(
        away_team:teams!games_away_team_id_fkey(key),
        home_team:teams!games_home_team_id_fkey(key),
        away_score,
        home_score,
        is_final
      )
    `)
    .eq('week', 10)
    .eq('league_id', LEAGUE_ID);

  console.log('\n\nWeek 10 Picks:');
  console.log('='.repeat(80));
  if (picks && picks.length > 0) {
    picks.forEach(p => {
      const status = p.is_correct !== null ? (p.is_correct ? '✅ WIN' : '❌ LOSS') : '⏳ PENDING';
      const game = p.games;
      const gameInfo = game ? `(${game.away_team.key} @ ${game.home_team.key} ${game.away_score}-${game.home_score})` : '';
      console.log(`${p.users.display_name.padEnd(25)} picked ${p.teams.key.padEnd(4)} ${gameInfo.padEnd(25)} ${status}`);
    });
    console.log(`\nTotal picks: ${picks.length}`);
    console.log(`Processed: ${picks.filter(p => p.is_correct !== null).length}`);
    console.log(`Pending: ${picks.filter(p => p.is_correct === null).length}`);
  } else {
    console.log('No Week 10 picks found!');
  }

  // Check current league status
  const { data: members } = await supabase
    .from('league_members')
    .select('*, users(display_name)')
    .eq('league_id', LEAGUE_ID)
    .order('is_eliminated', { ascending: true })
    .order('lives_remaining', { ascending: false });

  console.log('\n\nCurrent League Status:');
  console.log('='.repeat(80));
  if (members) {
    const alive = members.filter(m => !m.is_eliminated);
    const eliminated = members.filter(m => m.is_eliminated);

    console.log(`Alive: ${alive.length}`);
    alive.forEach(m => {
      console.log(`  ${m.users.display_name.padEnd(25)} ${m.lives_remaining} ${m.lives_remaining === 1 ? 'life' : 'lives'}`);
    });

    console.log(`\nEliminated: ${eliminated.length}`);
  }

  // Check Week 11 Thursday game
  console.log('\n\nWeek 11 Thursday Night Game:');
  console.log('='.repeat(80));
  const { data: week11Games } = await supabase
    .from('games')
    .select('*, home_team:teams!games_home_team_id_fkey(key, name), away_team:teams!games_away_team_id_fkey(key, name)')
    .eq('week', 11)
    .eq('season_year', 2025)
    .order('game_time')
    .limit(1);

  if (week11Games && week11Games.length > 0) {
    const g = week11Games[0];
    const status = g.is_final ? '✅ FINAL' : (g.home_score > 0 || g.away_score > 0 ? '🏃 IN PROGRESS' : '⏳ UPCOMING');
    console.log(`${g.away_team.key} @ ${g.home_team.key}: ${g.away_score}-${g.home_score} ${status}`);
  }
}

checkWeek10().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
