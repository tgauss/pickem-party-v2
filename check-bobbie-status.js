const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://cggoycedsybrajvdqjjk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
);

async function checkBobbieStatus() {
  console.log('🔍 CHECKING BOBBIE BOUCHER STATUS\n');

  const LEAGUE_ID = 'ce87e7df-2aa1-460e-b48f-0f2c0a905643';

  // Find Bobbie Boucher
  const { data: user } = await supabase
    .from('users')
    .select('id, username, display_name')
    .ilike('display_name', 'Bobbie Boucher')
    .single();

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log(`Found: ${user.display_name} (${user.username})`);
  console.log(`User ID: ${user.id}\n`);

  // Get member status
  const { data: member } = await supabase
    .from('league_members')
    .select('*')
    .eq('user_id', user.id)
    .eq('league_id', LEAGUE_ID)
    .single();

  console.log('Current Status:');
  console.log(`  Lives: ${member.lives_remaining}`);
  console.log(`  Eliminated: ${member.is_eliminated}`);
  console.log(`  Eliminated Week: ${member.eliminated_week || 'N/A'}\n`);

  // Get picks for weeks 5, 6, 7, 8
  const { data: picks } = await supabase
    .from('picks')
    .select(`
      id,
      week,
      is_correct,
      teams(key, city, name),
      games(
        home_score,
        away_score,
        is_final,
        home_team:teams!games_home_team_id_fkey(key),
        away_team:teams!games_away_team_id_fkey(key)
      )
    `)
    .eq('user_id', user.id)
    .eq('league_id', LEAGUE_ID)
    .in('week', [5, 6, 7, 8])
    .order('week');

  console.log('Pick History:');
  picks.forEach(p => {
    const game = p.games;
    const result = p.is_correct === null ? 'PENDING' : p.is_correct ? 'WIN ✓' : 'LOSS ✗';
    console.log(`  Week ${p.week}: ${p.teams.key} (${game.away_team.key} @ ${game.home_team.key}) - ${result}`);
  });

  // Determine correct elimination week
  console.log('\n📊 ANALYSIS:');

  let livesTracking = 2; // Starting lives
  let shouldBeEliminatedWeek = null;

  picks.forEach(p => {
    if (p.is_correct === false) {
      livesTracking--;
      console.log(`  Week ${p.week}: Lost a life (${livesTracking + 1} → ${livesTracking})`);
      if (livesTracking === 0 && !shouldBeEliminatedWeek) {
        shouldBeEliminatedWeek = p.week;
      }
    }
  });

  console.log(`\nExpected elimination week: ${shouldBeEliminatedWeek || 'Not eliminated'}`);
  console.log(`Current elimination week in DB: ${member.eliminated_week || 'N/A'}`);

  if (member.eliminated_week !== shouldBeEliminatedWeek) {
    console.log('\n⚠️  MISMATCH! Needs correction.');
    console.log(`\nShould update to: Week ${shouldBeEliminatedWeek}`);
  } else {
    console.log('\n✅ Elimination week is correct!');
  }
}

checkBobbieStatus().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
