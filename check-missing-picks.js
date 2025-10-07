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

  // Get all active members (not eliminated before Week 5)
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

  // Get all Week 5 picks
  const { data: picks } = await supabase
    .from('picks')
    .select(`
      user_id,
      team_id,
      is_correct,
      teams:team_id (
        key,
        city,
        name
      )
    `)
    .eq('week', 5)
    .eq('league_id', league.id);

  // Find who was active at start of Week 5 but didn't pick
  const activeBeforeWeek5 = members.filter(m => {
    return !m.is_eliminated || m.eliminated_week >= 5;
  });

  const pickUserIds = picks.map(p => p.user_id);
  const didNotPick = activeBeforeWeek5.filter(m => !pickUserIds.includes(m.user_id));

  console.log('Players who did NOT make a pick in Week 5:');
  console.log('-'.repeat(80));
  if (didNotPick.length > 0) {
    didNotPick.forEach(m => {
      console.log(`${m.users.username} (${m.users.display_name}) - Current lives: ${m.lives_remaining}, Eliminated: ${m.is_eliminated}`);
    });

    console.log('\n');
    console.log('These players should have lost a life for not picking!');
  } else {
    console.log('All active players made picks');
  }
  console.log();
  console.log(`Total active before Week 5: ${activeBeforeWeek5.length}`);
  console.log(`Total picks made: ${picks.length}`);
  console.log(`Missing picks: ${didNotPick.length}`);
})();
