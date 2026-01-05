const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://cggoycedsybrajvdqjjk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
);

const LEAGUE_ID = 'ce87e7df-2aa1-460e-b48f-0f2c0a905643'; // The Gridiron Gamble 2025

async function settleWeek9() {
  console.log('🎯 WEEK 9 SETTLEMENT - FINAL PROCESSING\n');
  console.log('='.repeat(100));

  // Get all Week 9 games
  const { data: games } = await supabase
    .from('games')
    .select(`
      *,
      home_team:teams!games_home_team_id_fkey(key, name),
      away_team:teams!games_away_team_id_fkey(key, name)
    `)
    .eq('season_year', 2025)
    .eq('week', 9)
    .order('game_time');

  console.log('\n📊 WEEK 9 GAMES:');
  console.log('='.repeat(100));
  if (games) {
    const allFinal = games.every(g => g.is_final);
    console.log(`Total games: ${games.length}`);
    console.log(`All games final: ${allFinal ? '✅ YES' : '❌ NO'}`);

    if (!allFinal) {
      console.log('\n⚠️  Not all games are final! Settlement may be incomplete.');
      games.filter(g => !g.is_final).forEach(g => {
        console.log(`  ⏳ ${g.away_team.key} @ ${g.home_team.key}`);
      });
    }
  }

  // Get all Week 9 picks
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
        home_team:teams!games_home_team_id_fkey(key, name),
        away_team:teams!games_away_team_id_fkey(key, name)
      )
    `)
    .eq('league_id', LEAGUE_ID)
    .eq('week', 9);

  console.log('\n\n🎲 WEEK 9 PICKS & RESULTS:');
  console.log('='.repeat(100));

  const correctPicks = [];
  const incorrectPicks = [];

  if (picks) {
    picks.forEach(p => {
      const game = p.games;
      const result = p.is_correct ? '✅ WIN' : '❌ LOSS';
      const score = `${game.away_score}-${game.home_score}`;
      console.log(`${p.users.display_name.padEnd(25)} picked ${p.teams.key.padEnd(4)} (${game.away_team.key} @ ${game.home_team.key} ${score}) ${result}`);

      if (p.is_correct) {
        correctPicks.push(p.users);
      } else {
        incorrectPicks.push(p.users);
      }
    });

    console.log(`\nTotal picks: ${picks.length}`);
    console.log(`Correct: ${correctPicks.length}`);
    console.log(`Incorrect: ${incorrectPicks.length}`);
  }

  // Process life deductions for incorrect picks
  console.log('\n\n💔 PROCESSING LIFE DEDUCTIONS:');
  console.log('='.repeat(100));

  const eliminations = [];

  for (const user of incorrectPicks) {
    // Get current member status
    const { data: member } = await supabase
      .from('league_members')
      .select('*')
      .eq('league_id', LEAGUE_ID)
      .eq('user_id', user.id)
      .single();

    if (!member) {
      console.log(`\n❌ Could not find member: ${user.display_name}`);
      continue;
    }

    const currentLives = member.lives_remaining;
    const newLives = Math.max(0, currentLives - 1);
    const willBeEliminated = newLives === 0;

    console.log(`\n${user.display_name}:`);
    console.log(`  Current lives: ${currentLives}`);
    console.log(`  New lives: ${newLives}`);
    console.log(`  Status: ${willBeEliminated ? '💀 ELIMINATED' : '💚 STILL ALIVE'}`);

    // Prepare update
    const updateData = {
      lives_remaining: newLives
    };

    if (willBeEliminated && !member.is_eliminated) {
      updateData.is_eliminated = true;
      updateData.eliminated_week = 9;
      eliminations.push(user.display_name);
    }

    // Apply update
    const { error } = await supabase
      .from('league_members')
      .update(updateData)
      .eq('league_id', LEAGUE_ID)
      .eq('user_id', user.id);

    if (error) {
      console.log(`  ❌ Error updating: ${error.message}`);
    } else {
      console.log(`  ✅ Updated: ${currentLives} → ${newLives} ${willBeEliminated ? '(ELIMINATED)' : 'lives'}`);
    }
  }

  // Final summary
  console.log('\n\n' + '='.repeat(100));
  console.log('📈 WEEK 9 FINAL SUMMARY');
  console.log('='.repeat(100));

  console.log(`\n✅ Correct picks: ${correctPicks.length}`);
  correctPicks.forEach(u => console.log(`   - ${u.display_name}`));

  console.log(`\n❌ Incorrect picks: ${incorrectPicks.length}`);
  incorrectPicks.forEach(u => console.log(`   - ${u.display_name}`));

  if (eliminations.length > 0) {
    console.log(`\n💀 Week 9 Eliminations: ${eliminations.length}`);
    eliminations.forEach(name => console.log(`   - ${name}`));
  } else {
    console.log(`\n💚 No new eliminations this week!`);
  }

  // Get updated standings
  const { data: standings } = await supabase
    .from('league_members')
    .select('*, users(display_name)')
    .eq('league_id', LEAGUE_ID)
    .order('is_eliminated', { ascending: true })
    .order('lives_remaining', { ascending: false });

  console.log('\n\n🏆 STANDINGS AFTER WEEK 9:');
  console.log('='.repeat(100));

  if (standings) {
    const alive = standings.filter(s => !s.is_eliminated);
    const eliminated = standings.filter(s => s.is_eliminated);

    console.log(`\n💚 ALIVE (${alive.length}):`);

    // Group by lives
    const twoLives = alive.filter(s => s.lives_remaining === 2);
    const oneLif = alive.filter(s => s.lives_remaining === 1);

    if (twoLives.length > 0) {
      console.log(`\n  2 Lives (${twoLives.length}):`);
      twoLives.forEach(s => console.log(`    - ${s.users.display_name}`));
    }

    if (oneLif.length > 0) {
      console.log(`\n  1 Life (${oneLif.length}):`);
      oneLif.forEach(s => console.log(`    - ${s.users.display_name}`));
    }

    console.log(`\n\n💀 ELIMINATED (${eliminated.length}):`);

    // Show Week 9 eliminations first
    const week9Elims = eliminated.filter(e => e.eliminated_week === 9);
    if (week9Elims.length > 0) {
      console.log(`\n  Week 9 (${week9Elims.length}):`);
      week9Elims.forEach(e => console.log(`    - ${e.users.display_name}`));
    }

    console.log(`\n  Previous Weeks (${eliminated.length - week9Elims.length}):`);
    const prevElims = eliminated.filter(e => e.eliminated_week !== 9);
    prevElims.forEach(e => console.log(`    - ${e.users.display_name} (Week ${e.eliminated_week})`));
  }

  console.log('\n\n✨ Week 9 settlement complete!\n');
}

settleWeek9().then(() => process.exit(0)).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
