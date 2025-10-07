const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
  // Get the league
  const { data: league } = await supabase
    .from('leagues')
    .select('id, name')
    .eq('invite_code', 'GRID2025')
    .single();

  console.log('League:', league.name, '\n');

  // Get all Week 5 picks with user details
  const { data: picks } = await supabase
    .from('picks')
    .select(`
      id,
      week,
      team_id,
      is_correct,
      users:user_id (
        id,
        username,
        display_name
      ),
      teams:team_id (
        key,
        city,
        name
      ),
      games:game_id (
        id,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        is_final
      )
    `)
    .eq('week', 5)
    .eq('league_id', league.id)
    .order('is_correct', { ascending: true });

  // Get current league member status
  const { data: members } = await supabase
    .from('league_members')
    .select(`
      user_id,
      lives_remaining,
      is_eliminated,
      eliminated_week,
      users:user_id (
        id,
        username,
        display_name
      )
    `)
    .eq('league_id', league.id);

  // Create a map for easy lookup
  const memberMap = {};
  members.forEach(m => {
    memberMap[m.user_id] = m;
  });

  console.log('='.repeat(100));
  console.log('WEEK 5 RECAP - GRIDIRON 2025');
  console.log('='.repeat(100));
  console.log();

  // Group picks by result
  const losses = picks.filter(p => p.is_correct === false);
  const wins = picks.filter(p => p.is_correct === true);
  const eliminated = picks.filter(p => {
    const member = memberMap[p.users.id];
    return member.is_eliminated && member.eliminated_week === 5;
  });

  console.log('📊 WEEK 5 STATISTICS');
  console.log('-'.repeat(100));
  console.log(`Total Picks: ${picks.length}`);
  console.log(`Wins: ${wins.length}`);
  console.log(`Losses: ${losses.length}`);
  console.log(`Eliminations: ${eliminated.length}`);
  console.log();

  // Eliminations
  if (eliminated.length > 0) {
    console.log('💀 ELIMINATED THIS WEEK');
    console.log('-'.repeat(100));
    console.log(`Username          Display Name          Team Picked       Result              Lives    Status`);
    console.log('-'.repeat(100));
    eliminated.forEach(pick => {
      const member = memberMap[pick.users.id];
      const teamStr = `${pick.teams.city} ${pick.teams.name}`.padEnd(17);
      const resultStr = (pick.is_correct ? 'WIN' : 'LOSS').padEnd(19);
      console.log(`${pick.users.username.padEnd(17)} ${pick.users.display_name.padEnd(21)} ${teamStr} ${resultStr} ${member.lives_remaining}        ELIMINATED`);
    });
    console.log();
  }

  // All losses (including those still alive with 1 life)
  console.log('❌ INCORRECT PICKS (Lost a Life)');
  console.log('-'.repeat(100));
  console.log(`Username          Display Name          Team Picked       Result              Lives    Status`);
  console.log('-'.repeat(100));
  losses.forEach(pick => {
    const member = memberMap[pick.users.id];
    const teamStr = `${pick.teams.city} ${pick.teams.name}`.padEnd(17);
    const resultStr = 'LOSS'.padEnd(19);
    const status = member.is_eliminated ? 'ELIMINATED' : 'ALIVE';
    console.log(`${pick.users.username.padEnd(17)} ${pick.users.display_name.padEnd(21)} ${teamStr} ${resultStr} ${member.lives_remaining}        ${status}`);
  });
  console.log();

  // All wins
  console.log('✅ CORRECT PICKS (Survived)');
  console.log('-'.repeat(100));
  console.log(`Username          Display Name          Team Picked       Result              Lives    Status`);
  console.log('-'.repeat(100));
  wins.forEach(pick => {
    const member = memberMap[pick.users.id];
    const teamStr = `${pick.teams.city} ${pick.teams.name}`.padEnd(17);
    const resultStr = 'WIN'.padEnd(19);
    console.log(`${pick.users.username.padEnd(17)} ${pick.users.display_name.padEnd(21)} ${teamStr} ${resultStr} ${member.lives_remaining}        ALIVE`);
  });
  console.log();

  // Current standings
  const alive = members.filter(m => !m.is_eliminated);
  const twoLives = alive.filter(m => m.lives_remaining === 2);
  const oneLife = alive.filter(m => m.lives_remaining === 1);
  const eliminatedAll = members.filter(m => m.is_eliminated);

  console.log('🏆 CURRENT STANDINGS AFTER WEEK 5');
  console.log('-'.repeat(100));
  console.log(`Players with 2 Lives: ${twoLives.length}`);
  twoLives.forEach(m => {
    console.log(`  - ${m.users.username} (${m.users.display_name})`);
  });
  console.log();
  console.log(`Players with 1 Life: ${oneLife.length} ⚠️ ON THE BUBBLE`);
  oneLife.forEach(m => {
    console.log(`  - ${m.users.username} (${m.users.display_name})`);
  });
  console.log();
  console.log(`Eliminated Players: ${eliminatedAll.length}`);
  eliminatedAll.forEach(m => {
    console.log(`  - ${m.users.username} (${m.users.display_name}) - Week ${m.eliminated_week}`);
  });
  console.log();
  console.log('='.repeat(100));
  console.log(`Total Active: ${alive.length} | Total Eliminated: ${eliminatedAll.length} | Total Players: ${members.length}`);
  console.log('='.repeat(100));
})();
