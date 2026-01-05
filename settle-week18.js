const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://cggoycedsybrajvdqjjk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
);

async function settleWeek18() {
  console.log('=== SETTLING WEEK 18 ===\n');

  // Get Week 18 picks
  const { data: picks, error: picksError } = await supabase
    .from('picks')
    .select(`
      id,
      user_id,
      league_id,
      is_correct,
      user:users(display_name),
      team:teams(name)
    `)
    .eq('week', 18);

  if (picksError) {
    console.error('Error fetching picks:', picksError);
    return;
  }

  // Process losing picks
  const losingPicks = picks.filter(p => p.is_correct === false);
  console.log(`Found ${losingPicks.length} losing pick(s) to process:\n`);

  for (const pick of losingPicks) {
    console.log(`Processing: ${pick.user.display_name} (picked ${pick.team.name})`);

    // Get current lives
    const { data: member, error: memberError } = await supabase
      .from('league_members')
      .select('lives_remaining, is_eliminated')
      .eq('user_id', pick.user_id)
      .eq('league_id', pick.league_id)
      .single();

    if (memberError) {
      console.error(`  Error fetching member:`, memberError);
      continue;
    }

    if (member.is_eliminated) {
      console.log(`  Already eliminated, skipping`);
      continue;
    }

    const newLives = member.lives_remaining - 1;
    console.log(`  Lives: ${member.lives_remaining} → ${newLives}`);

    // Update lives
    const updateData = {
      lives_remaining: newLives
    };

    if (newLives <= 0) {
      updateData.is_eliminated = true;
      updateData.eliminated_week = 18;
      console.log(`  *** ELIMINATED ***`);
    }

    const { error: updateError } = await supabase
      .from('league_members')
      .update(updateData)
      .eq('user_id', pick.user_id)
      .eq('league_id', pick.league_id);

    if (updateError) {
      console.error(`  Error updating:`, updateError);
    } else {
      console.log(`  Updated successfully`);
    }
  }

  // Show final standings
  console.log('\n=== FINAL STANDINGS AFTER WEEK 18 ===\n');

  const { data: activeMembers } = await supabase
    .from('league_members')
    .select('lives_remaining, is_eliminated, user:users(display_name)')
    .eq('is_eliminated', false)
    .order('lives_remaining', { ascending: false });

  if (activeMembers) {
    console.log('🏆 SURVIVORS (End of Regular Season):');
    for (const m of activeMembers) {
      console.log(`  ${m.user.display_name}: ${m.lives_remaining} ${m.lives_remaining === 1 ? 'life' : 'lives'}`);
    }
    console.log(`\nTotal remaining: ${activeMembers.length} players`);
  }
}

settleWeek18();
