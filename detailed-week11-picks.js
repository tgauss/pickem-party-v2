const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://cggoycedsybrajvdqjjk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
);

const LEAGUE_ID = 'ce87e7df-2aa1-460e-b48f-0f2c0a905643';

async function checkWeek11Picks() {
  console.log('🎲 WEEK 11 PICKS - DETAILED STATUS\n');
  console.log('='.repeat(100));

  // Get all alive members after Week 10
  const { data: aliveMembers } = await supabase
    .from('league_members')
    .select('*, users(id, display_name)')
    .eq('league_id', LEAGUE_ID)
    .eq('is_eliminated', false)
    .order('lives_remaining', { ascending: false });

  console.log('\n💚 ALIVE PLAYERS AFTER WEEK 10:');
  console.log('='.repeat(100));
  if (aliveMembers) {
    console.log(`Total: ${aliveMembers.length} players\n`);
    aliveMembers.forEach(m => {
      console.log(`  ${m.users.display_name.padEnd(25)} ${m.lives_remaining} ${m.lives_remaining === 1 ? 'life' : 'lives'}`);
    });
  }

  // Get all Week 11 picks (including from eliminated players)
  const { data: allPicks } = await supabase
    .from('picks')
    .select(`
      *,
      users(id, username, display_name),
      teams(team_id, key, city, name),
      games(
        id,
        game_time,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        is_final,
        home_team:teams!games_home_team_id_fkey(key, name),
        away_team:teams!games_away_team_id_fkey(key, name)
      )
    `)
    .eq('week', 11)
    .eq('league_id', LEAGUE_ID)
    .order('submitted_at');

  console.log('\n\n🎲 ALL WEEK 11 PICKS:');
  console.log('='.repeat(100));

  const aliveMemberIds = new Set(aliveMembers?.map(m => m.user_id) || []);
  const validPicks = [];
  const invalidPicks = [];

  if (allPicks && allPicks.length > 0) {
    console.log(`Total picks submitted: ${allPicks.length}\n`);

    allPicks.forEach(p => {
      const game = p.games;
      const isAlive = aliveMemberIds.has(p.user_id);
      const gameStatus = game.is_final ? '✅ FINAL' : '⏳ UPCOMING';
      const result = p.is_correct !== null ? (p.is_correct ? '✅ WIN' : '❌ LOSS') : '⏳ PENDING';
      const score = game.is_final ? `${game.away_score}-${game.home_score}` : 'TBD';
      const gameInfo = `${game.away_team.key} @ ${game.home_team.key} (${score})`;
      const validStatus = isAlive ? '✅' : '❌ ELIMINATED';

      console.log(`${validStatus} ${p.users.display_name.padEnd(25)} picked ${p.teams.key.padEnd(4)} in ${gameInfo.padEnd(30)} ${gameStatus} ${result}`);

      if (isAlive) {
        validPicks.push(p);
      } else {
        invalidPicks.push(p);
      }
    });

    console.log(`\n${'='.repeat(100)}`);
    console.log(`\nValid picks (from alive players): ${validPicks.length}`);
    console.log(`Invalid picks (from eliminated players): ${invalidPicks.length}`);

    if (invalidPicks.length > 0) {
      console.log(`\n⚠️  PICKS FROM ELIMINATED PLAYERS (should be disregarded):`);
      invalidPicks.forEach(p => {
        console.log(`  - ${p.users.display_name} picked ${p.teams.key}`);
      });
    }

  } else {
    console.log('No Week 11 picks found!');
  }

  // Check for missing picks from alive players
  if (aliveMembers && validPicks) {
    const pickerIds = new Set(validPicks.map(p => p.user_id));
    const missingPicks = aliveMembers.filter(m => !pickerIds.has(m.user_id));

    console.log(`\n\n⚠️  MISSING WEEK 11 PICKS:`);
    console.log('='.repeat(100));
    if (missingPicks.length > 0) {
      missingPicks.forEach(m => {
        console.log(`  ❌ ${m.users.display_name.padEnd(25)} (${m.lives_remaining} ${m.lives_remaining === 1 ? 'life' : 'lives'})`);
      });
      console.log(`\nTotal missing: ${missingPicks.length}/${aliveMembers.length} players`);
    } else {
      console.log(`  ✅ All ${aliveMembers.length} alive players have submitted picks!`);
    }
  }

  // Show Week 11 games status
  const { data: games } = await supabase
    .from('games')
    .select('*, home_team:teams!games_home_team_id_fkey(key, name), away_team:teams!games_away_team_id_fkey(key, name)')
    .eq('week', 11)
    .eq('season_year', 2025)
    .order('game_time');

  console.log('\n\n🏈 WEEK 11 GAMES STATUS:');
  console.log('='.repeat(100));
  if (games) {
    const finalGames = games.filter(g => g.is_final);
    const upcomingGames = games.filter(g => !g.is_final);

    console.log(`Total: ${games.length} games`);
    console.log(`Completed: ${finalGames.length}`);
    console.log(`Upcoming: ${upcomingGames.length}\n`);

    if (finalGames.length > 0) {
      console.log(`✅ COMPLETED (${finalGames.length}):`);
      finalGames.forEach(g => {
        console.log(`  ${g.away_team.key.padEnd(4)} @ ${g.home_team.key.padEnd(4)}: ${g.away_score}-${g.home_score} FINAL`);
      });
    }

    if (upcomingGames.length > 0) {
      console.log(`\n⏳ UPCOMING (${upcomingGames.length}):`);
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

  // Pick distribution
  if (validPicks.length > 0) {
    console.log(`\n\n📊 PICK DISTRIBUTION (Valid Picks Only):`);
    console.log('='.repeat(100));

    const pickCounts = {};
    validPicks.forEach(p => {
      const team = p.teams.key;
      if (!pickCounts[team]) {
        pickCounts[team] = {
          count: 0,
          players: [],
          game: p.games
        };
      }
      pickCounts[team].count++;
      pickCounts[team].players.push(p.users.display_name);
    });

    const sorted = Object.entries(pickCounts).sort((a, b) => b[1].count - a[1].count);
    sorted.forEach(([team, data]) => {
      const game = data.game;
      const gameInfo = `${game.away_team.key} @ ${game.home_team.key}`;
      const status = game.is_final ? '✅ FINAL' : '⏳ UPCOMING';
      console.log(`\n${team} (${data.count} ${data.count === 1 ? 'pick' : 'picks'}) - ${gameInfo} ${status}`);
      data.players.forEach(p => console.log(`  - ${p}`));
    });
  }
}

checkWeek11Picks().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
