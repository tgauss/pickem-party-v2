const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://cggoycedsybrajvdqjjk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
);

async function removeJordanWeek9Pick() {
  console.log('🗑️  REMOVING JORDAN PETRUSICH WEEK 9 PICK\n');

  const LEAGUE_ID = 'ce87e7df-2aa1-460e-b48f-0f2c0a905643';

  // Find Jordan Petrusich's user ID
  const { data: user } = await supabase
    .from('users')
    .select('id, username, display_name')
    .ilike('display_name', 'Jordan Petrusich')
    .single();

  if (!user) {
    console.log('Could not find Jordan Petrusich user');
    return;
  }

  console.log(`Found user: ${user.display_name} (${user.username})`);
  console.log(`User ID: ${user.id}\n`);

  // Check elimination status
  const { data: member } = await supabase
    .from('league_members')
    .select('is_eliminated, eliminated_week, lives_remaining')
    .eq('user_id', user.id)
    .eq('league_id', LEAGUE_ID)
    .single();

  console.log('Player status:');
  console.log(`  Eliminated: ${member.is_eliminated}`);
  console.log(`  Eliminated Week: ${member.eliminated_week || 'N/A'}`);
  console.log(`  Lives: ${member.lives_remaining}\n`);

  // Find Week 9 pick
  const { data: pick } = await supabase
    .from('picks')
    .select(`
      *,
      teams(key, city, name),
      games(
        home_team:teams!games_home_team_id_fkey(key),
        away_team:teams!games_away_team_id_fkey(key)
      )
    `)
    .eq('week', 9)
    .eq('league_id', LEAGUE_ID)
    .eq('user_id', user.id)
    .single();

  if (!pick) {
    console.log('No Week 9 pick found for Jordan Petrusich');
    return;
  }

  console.log('Found Week 9 pick:');
  console.log(`  Team: ${pick.teams.key} (${pick.teams.city} ${pick.teams.name})`);
  console.log(`  Game: ${pick.games.away_team.key} @ ${pick.games.home_team.key}`);
  console.log(`  Pick ID: ${pick.id}`);

  if (member.is_eliminated && member.eliminated_week === 8) {
    console.log('\n✓ Confirmed: Player was eliminated in Week 8');
    console.log('  Deleting Week 9 pick...\n');

    const { error: deleteError } = await supabase
      .from('picks')
      .delete()
      .eq('id', pick.id);

    if (deleteError) {
      console.log(`✗ Failed to delete pick: ${deleteError.message}`);
    } else {
      console.log('✅ Successfully deleted Jordan Petrusich\'s Week 9 pick');
      console.log(`   Pick ID ${pick.id} removed`);
    }
  } else {
    console.log('\n⚠️  Player elimination status doesn\'t match - not deleting');
    return;
  }

  // Verify remaining Week 9 picks
  const { data: remaining } = await supabase
    .from('picks')
    .select(`
      id,
      users(display_name),
      teams(key)
    `)
    .eq('week', 9)
    .eq('league_id', LEAGUE_ID);

  console.log(`\n📊 Remaining Week 9 picks: ${remaining.length}`);
  remaining.forEach(p => {
    console.log(`  - ${p.users.display_name}: ${p.teams.key}`);
  });

  console.log('\n✅ Done!');
}

removeJordanWeek9Pick().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
