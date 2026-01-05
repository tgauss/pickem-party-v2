const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://cggoycedsybrajvdqjjk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
);

const LEAGUE_ID = 'ce87e7df-2aa1-460e-b48f-0f2c0a905643';

async function auditAllLives() {
  console.log('🔍 AUDITING ALL MEMBER LIVES\n');

  // Get all members
  const { data: members } = await supabase
    .from('league_members')
    .select('*, users(id, display_name)')
    .eq('league_id', LEAGUE_ID)
    .order('is_eliminated', { ascending: true })
    .order('lives_remaining', { ascending: false });

  if (!members) {
    console.log('No members found');
    return;
  }

  console.log(`Total members: ${members.length}\n`);
  console.log('='.repeat(100));

  const issues = [];

  for (const member of members) {
    // Get all picks for this member
    const { data: picks } = await supabase
      .from('picks')
      .select('week, is_correct')
      .eq('user_id', member.user_id)
      .eq('league_id', LEAGUE_ID)
      .order('week');

    const incorrectCount = picks?.filter(p => p.is_correct === false).length || 0;
    const expectedLives = Math.max(0, 2 - incorrectCount);
    const actualLives = member.lives_remaining;
    const shouldBeEliminated = expectedLives === 0;

    const match = (expectedLives === actualLives) && (shouldBeEliminated === member.is_eliminated);

    if (!match) {
      issues.push({
        name: member.users.display_name,
        incorrectCount,
        expectedLives,
        actualLives,
        shouldBeEliminated,
        isEliminated: member.is_eliminated,
        eliminatedWeek: member.eliminated_week
      });
    }

    const status = match ? '✅' : '❌';
    console.log(`${status} ${member.users.display_name.padEnd(25)} | Losses: ${incorrectCount} | Expected: ${expectedLives} lives | Actual: ${actualLives} lives | Elim: ${member.is_eliminated ? 'Y' : 'N'}`);
  }

  if (issues.length > 0) {
    console.log('\n' + '='.repeat(100));
    console.log(`\n⚠️  FOUND ${issues.length} DISCREPANCIES:\n`);
    issues.forEach(issue => {
      console.log(`${issue.name}:`);
      console.log(`  Incorrect picks: ${issue.incorrectCount}`);
      console.log(`  Expected lives: ${issue.expectedLives}`);
      console.log(`  Actual lives: ${issue.actualLives}`);
      console.log(`  Should be eliminated: ${issue.shouldBeEliminated}`);
      console.log(`  Is eliminated: ${issue.isEliminated}`);
      console.log('');
    });
  } else {
    console.log('\n' + '='.repeat(100));
    console.log('\n✅ All member lives are correct!\n');
  }
}

auditAllLives().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
