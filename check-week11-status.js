const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://cggoycedsybrajvdqjjk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
);

const LEAGUE_ID = 'ce87e7df-2aa1-460e-b48f-0f2c0a905643';

async function checkWeek11() {
  console.log('📊 CHECKING WEEK 11 STATUS\n');
  console.log('='.repeat(100));

  // Get alive members after Week 10
  const { data: members } = await supabase
    .from('league_members')
    .select('*, users(id, display_name)')
    .eq('league_id', LEAGUE_ID)
    .eq('is_eliminated', false)
    .order('lives_remaining', { ascending: false });

  console.log('\n💚 ALIVE PLAYERS (After Week 10):');
  console.log('='.repeat(100));
  if (members) {
    console.log(`Total: ${members.length} players\n`);
    members.forEach(m => {
      console.log(`  ${m.users.display_name.padEnd(25)} ${m.lives_remaining} ${m.lives_remaining === 1 ? 'life' : 'lives'}`);
    });
  }

  // Check Week 11 games
  const { data: games } = await supabase
    .from('games')
    .select('*, home_team:teams!games_home_team_id_fkey(key, name), away_team:teams!games_away_team_id_fkey(key, name)')
    .eq('week', 11)
    .eq('season_year', 2025)
    .order('game_time');

  console.log('\n\n🏈 WEEK 11 GAMES:');
  console.log('='.repeat(100));
  if (games && games.length > 0) {
    console.log(`Total games: ${games.length}\n`);

    const finalGames = games.filter(g => g.is_final);
    const upcomingGames = games.filter(g => !g.is_final);

    if (finalGames.length > 0) {
      console.log(`✅ COMPLETED GAMES (${finalGames.length}):`);
      finalGames.forEach(g => {
        console.log(`  ${g.away_team.key.padEnd(4)} @ ${g.home_team.key.padEnd(4)}: ${g.away_score}-${g.home_score} FINAL`);
      });
    }

    if (upcomingGames.length > 0) {
      console.log(`\n⏳ UPCOMING GAMES (${upcomingGames.length}):`);
      upcomingGames.forEach(g => {
        const time = new Date(g.game_time).toLocaleString('en-US', {
          timeZone: 'America/New_York',
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short'
        });
        console.log(`  ${g.away_team.key.padEnd(4)} @ ${g.home_team.key.padEnd(4)} - ${time}`);
      });
    }
  }

  // Check Week 11 picks
  const { data: picks } = await supabase
    .from('picks')
    .select(`
      *,
      users(id, username, display_name),
      teams(key, name),
      games(
        away_team:teams!games_away_team_id_fkey(key),
        home_team:teams!games_home_team_id_fkey(key),
        away_score,
        home_score,
        is_final
      )
    `)
    .eq('week', 11)
    .eq('league_id', LEAGUE_ID);

  console.log('\n\n🎲 WEEK 11 PICKS:');
  console.log('='.repeat(100));
  if (picks && picks.length > 0) {
    console.log(`Total picks submitted: ${picks.length}/${members?.length || 0}\n`);

    picks.forEach(p => {
      const game = p.games;
      const gameStatus = game.is_final ? '✅ FINAL' : '⏳ UPCOMING';
      const result = p.is_correct !== null ? (p.is_correct ? '✅ WIN' : '❌ LOSS') : '⏳ PENDING';
      const gameInfo = `(${game.away_team.key} @ ${game.home_team.key} ${game.away_score}-${game.home_score})`;
      console.log(`  ${p.users.display_name.padEnd(25)} picked ${p.teams.key.padEnd(4)} ${gameInfo.padEnd(25)} ${gameStatus} ${result}`);
    });

    const processed = picks.filter(p => p.is_correct !== null).length;
    const pending = picks.filter(p => p.is_correct === null).length;

    console.log(`\nStatus:`);
    console.log(`  Processed: ${processed}`);
    console.log(`  Pending: ${pending}`);
  } else {
    console.log('No Week 11 picks submitted yet!');
  }

  // Check for missing picks
  if (members && picks) {
    const memberIds = new Set(members.map(m => m.user_id));
    const pickerIds = new Set(picks.map(p => p.user_id));

    const missingPicks = members.filter(m => !pickerIds.has(m.user_id));

    if (missingPicks.length > 0) {
      console.log(`\n\n⚠️  MISSING WEEK 11 PICKS (${missingPicks.length}):`);
      console.log('='.repeat(100));
      missingPicks.forEach(m => {
        console.log(`  ${m.users.display_name.padEnd(25)} (${m.lives_remaining} ${m.lives_remaining === 1 ? 'life' : 'lives'})`);
      });
      console.log('\n⚠️  These players need to submit picks before games lock!');
    } else {
      console.log(`\n\n✅ All ${members.length} alive players have submitted Week 11 picks!`);
    }
  }
}

checkWeek11().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
