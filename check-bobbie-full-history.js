const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://cggoycedsybrajvdqjjk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
);

async function checkFullHistory() {
  console.log('🔍 BOBBIE BOUCHER - FULL PICK HISTORY\n');

  const LEAGUE_ID = 'ce87e7df-2aa1-460e-b48f-0f2c0a905643';

  // Find Bobbie
  const { data: user } = await supabase
    .from('users')
    .select('id, username, display_name')
    .ilike('display_name', 'Bobbie Boucher')
    .single();

  console.log(`Player: ${user.display_name} (${user.username})\n`);

  // Get ALL picks
  const { data: picks } = await supabase
    .from('picks')
    .select(`
      id,
      week,
      is_correct,
      submitted_at,
      teams(key, city, name),
      games(
        home_score,
        away_score,
        is_final,
        game_time,
        home_team:teams!games_home_team_id_fkey(key),
        away_team:teams!games_away_team_id_fkey(key)
      )
    `)
    .eq('user_id', user.id)
    .eq('league_id', LEAGUE_ID)
    .order('week');

  console.log('COMPLETE PICK HISTORY:\n');

  let lives = 2;
  let eliminatedWeek = null;

  picks.forEach(p => {
    const game = p.games;
    const result = p.is_correct === null ? 'PENDING' : p.is_correct ? 'WIN ✓' : 'LOSS ✗';
    const gameTime = new Date(game.game_time);
    const submitTime = new Date(p.submitted_at);
    const onTime = submitTime < gameTime ? '✓' : '⚠️ LATE';

    console.log(`Week ${p.week}: ${p.teams.key.padEnd(4)} (${game.away_team.key} @ ${game.home_team.key})`);
    console.log(`  Result: ${result}`);
    console.log(`  Game Time: ${gameTime.toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
    console.log(`  Submit Time: ${submitTime.toLocaleString('en-US', { timeZone: 'America/New_York' })} ${onTime}`);

    if (p.is_correct === false) {
      lives--;
      console.log(`  Lives: ${lives + 1} → ${lives}`);
      if (lives === 0 && !eliminatedWeek) {
        eliminatedWeek = p.week;
        console.log(`  💀 ELIMINATED`);
      }
    } else if (p.is_correct === true) {
      console.log(`  Lives: ${lives} (no change)`);
    }
    console.log('');
  });

  console.log('='.repeat(60));
  console.log(`FINAL STATUS:`);
  console.log(`  Lives remaining: ${lives}`);
  console.log(`  Should be eliminated: ${lives === 0 ? 'YES' : 'NO'}`);
  console.log(`  Elimination week: ${eliminatedWeek || 'N/A'}`);

  // Check DB status
  const { data: member } = await supabase
    .from('league_members')
    .select('lives_remaining, is_eliminated, eliminated_week')
    .eq('user_id', user.id)
    .eq('league_id', LEAGUE_ID)
    .single();

  console.log(`\nDATABASE STATUS:`);
  console.log(`  Lives remaining: ${member.lives_remaining}`);
  console.log(`  Is eliminated: ${member.is_eliminated}`);
  console.log(`  Eliminated week: ${member.eliminated_week || 'N/A'}`);

  if (member.eliminated_week !== eliminatedWeek) {
    console.log(`\n⚠️  MISMATCH!`);
    console.log(`  Expected: Week ${eliminatedWeek}`);
    console.log(`  Current: Week ${member.eliminated_week}`);
  }
}

checkFullHistory().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
