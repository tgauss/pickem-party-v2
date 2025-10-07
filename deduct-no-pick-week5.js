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

  const noPickers = [
    { username: 'kyler', display_name: 'Kyler Stroud', current_lives: 1 },
    { username: 'keeganmcadam', display_name: 'Keegan McAdam', current_lives: 2 }
  ];

  console.log('Deducting lives for players who did not pick in Week 5...\n');

  for (const player of noPickers) {
    // Get user ID
    const { data: user } = await supabase
      .from('users')
      .select('id, username, display_name')
      .eq('username', player.username)
      .single();

    if (!user) {
      console.log(`❌ User not found: ${player.username}`);
      continue;
    }

    // Get current member status
    const { data: member } = await supabase
      .from('league_members')
      .select('lives_remaining, is_eliminated')
      .eq('league_id', league.id)
      .eq('user_id', user.id)
      .single();

    const newLives = member.lives_remaining - 1;
    const isNowEliminated = newLives <= 0;

    console.log(`${user.username} (${user.display_name})`);
    console.log(`  Before: ${member.lives_remaining} lives`);
    console.log(`  After: ${newLives} lives`);
    console.log(`  Status: ${isNowEliminated ? 'ELIMINATED' : 'ALIVE'}`);

    // Update league member
    const { error } = await supabase
      .from('league_members')
      .update({
        lives_remaining: Math.max(0, newLives),
        is_eliminated: isNowEliminated,
        eliminated_week: isNowEliminated ? 5 : member.eliminated_week
      })
      .eq('league_id', league.id)
      .eq('user_id', user.id);

    if (error) {
      console.log(`  ❌ Error: ${error.message}`);
    } else {
      console.log(`  ✅ Updated successfully`);
    }
    console.log();
  }

  console.log('Complete!');
})();
