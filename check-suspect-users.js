const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://cggoycedsybrajvdqjjk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
);

const LEAGUE_ID = 'ce87e7df-2aa1-460e-b48f-0f2c0a905643';

async function checkSuspectUsers() {
  console.log('🔍 CHECKING SUSPECT USER ELIMINATIONS\n');

  // Get Shneebly, Kyler, and Keegan's user IDs first
  const { data: users } = await supabase
    .from('users')
    .select('id, display_name')
    .in('display_name', ['Shneebly', 'Kyler Stroud', 'Keegan McAdam']);

  if (!users) return;

  for (const user of users) {
    console.log(`\n${user.display_name}:`);
    console.log('='.repeat(80));

    // Get member info
    const { data: member } = await supabase
      .from('league_members')
      .select('*')
      .eq('league_id', LEAGUE_ID)
      .eq('user_id', user.id)
      .single();

    if (member) {
      console.log(`Eliminated: ${member.is_eliminated}`);
      console.log(`Eliminated Week: ${member.eliminated_week || 'N/A'}`);
      console.log(`Lives: ${member.lives_remaining}`);
    }

    // Get picks
    const { data: picks } = await supabase
      .from('picks')
      .select('week, is_correct')
      .eq('user_id', user.id)
      .eq('league_id', LEAGUE_ID)
      .order('week');

    const weeksPicked = new Set(picks?.map(p => p.week) || []);
    const eliminatedWeek = member?.eliminated_week || 9;
    const missingWeeks = [];

    for (let week = 1; week <= eliminatedWeek; week++) {
      if (!weeksPicked.has(week)) {
        missingWeeks.push(week);
      }
    }

    console.log(`\nPicks: ${picks?.length || 0}`);
    if (picks) {
      picks.forEach(p => {
        const result = p.is_correct ? '✅' : '❌';
        console.log(`  Week ${p.week}: ${result}`);
      });
    }

    if (missingWeeks.length > 0) {
      console.log(`\n⚠️  Missing weeks: ${missingWeeks.join(', ')}`);
    }
  }
}

checkSuspectUsers().then(() => process.exit(0));
