const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://cggoycedsybrajvdqjjk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
);

const LEAGUE_ID = 'ce87e7df-2aa1-460e-b48f-0f2c0a905643';
const JAREN_USER_ID = 'aa3a5cb4-43d9-4870-a680-85d1c6a42fbc';

async function checkJarenHistory() {
  console.log('🔍 JAREN PETRUSICH PICK HISTORY\n');

  // Get all of Jaren's picks
  const { data: picks } = await supabase
    .from('picks')
    .select(`
      *,
      teams(key, name),
      games(
        week,
        away_score,
        home_score,
        home_team:teams!games_home_team_id_fkey(key),
        away_team:teams!games_away_team_id_fkey(key)
      )
    `)
    .eq('user_id', JAREN_USER_ID)
    .eq('league_id', LEAGUE_ID)
    .order('week');

  console.log('Pick History:');
  console.log('='.repeat(80));
  if (picks) {
    picks.forEach(p => {
      const result = p.is_correct === null ? '⏳ PENDING' : (p.is_correct ? '✅ WIN' : '❌ LOSS');
      const game = p.games;
      console.log(`Week ${p.week}: Picked ${p.teams.key.padEnd(4)} (${game.away_team.key} @ ${game.home_team.key} ${game.away_score}-${game.home_score}) ${result}`);
    });

    const totalPicks = picks.length;
    const correctPicks = picks.filter(p => p.is_correct === true).length;
    const incorrectPicks = picks.filter(p => p.is_correct === false).length;
    const pendingPicks = picks.filter(p => p.is_correct === null).length;

    console.log(`\nSummary:`);
    console.log(`  Total picks: ${totalPicks}`);
    console.log(`  Correct: ${correctPicks}`);
    console.log(`  Incorrect: ${incorrectPicks}`);
    console.log(`  Pending: ${pendingPicks}`);

    // Calculate expected lives
    const startingLives = 2;
    const expectedLives = Math.max(0, startingLives - incorrectPicks);

    console.log(`\nExpected Lives Calculation:`);
    console.log(`  Starting lives: ${startingLives}`);
    console.log(`  Incorrect picks: ${incorrectPicks}`);
    console.log(`  Expected lives remaining: ${expectedLives}`);
  }

  // Get current member status
  const { data: member } = await supabase
    .from('league_members')
    .select('*')
    .eq('league_id', LEAGUE_ID)
    .eq('user_id', JAREN_USER_ID)
    .single();

  if (member) {
    console.log(`\nCurrent Member Status:`);
    console.log(`  Lives remaining: ${member.lives_remaining}`);
    console.log(`  Eliminated: ${member.is_eliminated}`);
    console.log(`  Eliminated week: ${member.eliminated_week || 'N/A'}`);

    // Check if it matches expected
    const incorrectCount = picks.filter(p => p.is_correct === false).length;
    const expectedLives = Math.max(0, 2 - incorrectCount);

    console.log(`\nVerification:`);
    if (member.lives_remaining === expectedLives) {
      console.log(`  ✅ Lives remaining matches expected (${expectedLives})`);
    } else {
      console.log(`  ❌ MISMATCH! Expected ${expectedLives} lives, but has ${member.lives_remaining}`);
    }

    if (expectedLives === 0 && !member.is_eliminated) {
      console.log(`  ❌ Should be eliminated but is_eliminated is false!`);
    } else if (expectedLives === 0 && member.is_eliminated) {
      console.log(`  ✅ Correctly marked as eliminated`);
    }
  }
}

checkJarenHistory().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
