const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://cggoycedsybrajvdqjjk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
);

async function fixBobbieElimination() {
  console.log('🔧 FIXING BOBBIE BOUCHER ELIMINATION WEEK\n');

  const LEAGUE_ID = 'ce87e7df-2aa1-460e-b48f-0f2c0a905643';

  // Find Bobbie
  const { data: user } = await supabase
    .from('users')
    .select('id, username, display_name')
    .ilike('display_name', 'Bobbie Boucher')
    .single();

  console.log(`Player: ${user.display_name}`);
  console.log(`User ID: ${user.id}\n`);

  // Get current status
  const { data: memberBefore } = await supabase
    .from('league_members')
    .select('lives_remaining, is_eliminated, eliminated_week')
    .eq('user_id', user.id)
    .eq('league_id', LEAGUE_ID)
    .single();

  console.log('CURRENT DATABASE STATUS:');
  console.log(`  Lives: ${memberBefore.lives_remaining}`);
  console.log(`  Eliminated: ${memberBefore.is_eliminated}`);
  console.log(`  Elimination Week: ${memberBefore.eliminated_week}\n`);

  // Update to correct elimination week
  console.log('Updating to Week 7...\n');

  const { error: updateError } = await supabase
    .from('league_members')
    .update({
      eliminated_week: 7
    })
    .eq('user_id', user.id)
    .eq('league_id', LEAGUE_ID);

  if (updateError) {
    console.log(`✗ Failed to update: ${updateError.message}`);
    return;
  }

  console.log('✓ Successfully updated elimination week to 7\n');

  // Verify the update
  const { data: memberAfter } = await supabase
    .from('league_members')
    .select('lives_remaining, is_eliminated, eliminated_week')
    .eq('user_id', user.id)
    .eq('league_id', LEAGUE_ID)
    .single();

  console.log('UPDATED DATABASE STATUS:');
  console.log(`  Lives: ${memberAfter.lives_remaining}`);
  console.log(`  Eliminated: ${memberAfter.is_eliminated}`);
  console.log(`  Elimination Week: ${memberAfter.eliminated_week}\n`);

  // Check Week 8 pick (should be removed)
  const { data: week8Pick } = await supabase
    .from('picks')
    .select('id, teams(key)')
    .eq('user_id', user.id)
    .eq('league_id', LEAGUE_ID)
    .eq('week', 8)
    .single();

  if (week8Pick) {
    console.log(`Found Week 8 pick: ${week8Pick.teams.key}`);
    console.log('This pick was made after elimination and should be removed.\n');

    const { error: deleteError } = await supabase
      .from('picks')
      .delete()
      .eq('id', week8Pick.id);

    if (deleteError) {
      console.log(`✗ Failed to delete Week 8 pick: ${deleteError.message}`);
    } else {
      console.log('✓ Deleted Week 8 pick (made after elimination)\n');
    }
  }

  console.log('✅ Bobbie Boucher now correctly shows as eliminated in Week 7!');
}

fixBobbieElimination().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
