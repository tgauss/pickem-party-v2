const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://cggoycedsybrajvdqjjk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
);

async function settleWeek8() {
  console.log('🎯 PROCESSING WEEK 8 SETTLEMENT\n');

  const LEAGUE_ID = 'ce87e7df-2aa1-460e-b48f-0f2c0a905643'; // The Gridiron Gamble 2025

  // Get all Week 8 picks with full details
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
    .eq('week', 8);

  console.log(`Found ${picks.length} Week 8 picks\n`);

  const pickUpdates = [];
  const lifeUpdates = [];
  const eliminations = [];

  for (const pick of picks) {
    const game = pick.games;
    const pickedTeam = pick.teams;
    const user = pick.users;

    if (!game.is_final) {
      console.log(`⏳ ${user.display_name}: Game not final yet (${game.away_team.key} @ ${game.home_team.key})`);
      continue;
    }

    const isHome = pickedTeam.team_id === game.home_team_id;
    const homeWon = game.home_score > game.away_score;
    const awayWon = game.away_score > game.home_score;
    const isTie = game.home_score === game.away_score;

    let isCorrect = false;

    if (isTie) {
      // Ties count as losses in survivor pools
      isCorrect = false;
    } else if (isHome && homeWon) {
      isCorrect = true;
    } else if (!isHome && awayWon) {
      isCorrect = true;
    }

    const result = isCorrect ? '✓ WIN' : '✗ LOSS';
    const score = `${game.away_score}-${game.home_score}`;

    console.log(`${user.display_name.padEnd(25)} picked ${pickedTeam.key.padEnd(4)} (${game.away_team.key} @ ${game.home_team.key}) ${score} ${result}`);

    // Update pick with result
    pickUpdates.push({
      pickId: pick.id,
      isCorrect,
      userId: user.id,
      username: user.username,
      displayName: user.display_name,
      pickedTeam: pickedTeam.key,
      result
    });

    // If incorrect, prepare life deduction
    if (!isCorrect) {
      lifeUpdates.push({
        userId: user.id,
        username: user.username,
        displayName: user.display_name
      });
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('📝 UPDATING PICK RESULTS');
  console.log('='.repeat(80));

  for (const update of pickUpdates) {
    const { error } = await supabase
      .from('picks')
      .update({ is_correct: update.isCorrect })
      .eq('id', update.pickId);

    if (error) {
      console.log(`✗ Failed to update ${update.displayName}: ${error.message}`);
    } else {
      console.log(`✓ Updated ${update.displayName}: ${update.result}`);
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('💔 PROCESSING LIFE DEDUCTIONS');
  console.log('='.repeat(80));

  for (const lossUser of lifeUpdates) {
    // Get current member status
    const { data: member } = await supabase
      .from('league_members')
      .select('*')
      .eq('league_id', LEAGUE_ID)
      .eq('user_id', lossUser.userId)
      .single();

    if (!member) {
      console.log(`✗ Could not find member: ${lossUser.displayName}`);
      continue;
    }

    const newLives = Math.max(0, member.lives_remaining - 1);
    const willBeEliminated = newLives === 0;

    console.log(`\n${lossUser.displayName}:`);
    console.log(`  Current lives: ${member.lives_remaining}`);
    console.log(`  New lives: ${newLives}`);
    console.log(`  Status: ${willBeEliminated ? 'ELIMINATED' : 'STILL ALIVE'}`);

    // Update member
    const updateData = {
      lives_remaining: newLives
    };

    if (willBeEliminated) {
      updateData.is_eliminated = true;
      updateData.eliminated_week = 8;
      eliminations.push(lossUser.displayName);
    }

    const { error } = await supabase
      .from('league_members')
      .update(updateData)
      .eq('league_id', LEAGUE_ID)
      .eq('user_id', lossUser.userId);

    if (error) {
      console.log(`  ✗ Failed to update: ${error.message}`);
    } else {
      console.log(`  ✓ Lives updated: ${member.lives_remaining} → ${newLives}`);
      if (willBeEliminated) {
        console.log(`  💀 ELIMINATED in Week 8`);
      }
    }
  }

  // Final summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 WEEK 8 FINAL SUMMARY');
  console.log('='.repeat(80));

  const correctCount = pickUpdates.filter(p => p.result === '✓ WIN').length;
  const incorrectCount = pickUpdates.filter(p => p.result === '✗ LOSS').length;

  console.log(`Total picks processed: ${pickUpdates.length}`);
  console.log(`Correct picks: ${correctCount}`);
  console.log(`Incorrect picks: ${incorrectCount}`);
  console.log(`Life deductions: ${lifeUpdates.length}`);
  console.log(`Eliminations: ${eliminations.length}`);

  if (eliminations.length > 0) {
    console.log(`\n💀 Eliminated in Week 8:`);
    eliminations.forEach(name => console.log(`  - ${name}`));
  }

  // Get current standings
  const { data: standings } = await supabase
    .from('league_members')
    .select('*, users(display_name)')
    .eq('league_id', LEAGUE_ID)
    .order('lives_remaining', { ascending: false });

  console.log(`\n${'='.repeat(80)}`);
  console.log('🏆 CURRENT STANDINGS AFTER WEEK 8');
  console.log('='.repeat(80));

  const alive = standings.filter(s => !s.is_eliminated);
  const eliminated = standings.filter(s => s.is_eliminated);

  console.log(`\nAlive: ${alive.length}`);
  alive.forEach(s => {
    console.log(`  ${s.users.display_name.padEnd(25)} ${s.lives_remaining} ${s.lives_remaining === 1 ? 'life' : 'lives'}`);
  });

  console.log(`\nEliminated: ${eliminated.length}`);
  eliminated.forEach(s => {
    console.log(`  ${s.users.display_name.padEnd(25)} Week ${s.eliminated_week}`);
  });

  console.log('\n✅ Week 8 settlement complete!');
}

settleWeek8().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
