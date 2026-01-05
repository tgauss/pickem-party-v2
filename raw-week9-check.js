const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://cggoycedsybrajvdqjjk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
);

const LEAGUE_ID = 'ce87e7df-2aa1-460e-b48f-0f2c0a905643';

async function rawCheck() {
  console.log('🔬 RAW DATABASE CHECK\n');

  // Check picks table directly
  console.log('1. Checking all picks for week 9:');
  console.log('='.repeat(80));
  const { data: allWeek9Picks, error: picksError } = await supabase
    .from('picks')
    .select('*')
    .eq('week', 9);

  if (picksError) {
    console.log('Error fetching picks:', picksError);
  } else {
    console.log(`Total Week 9 picks in database: ${allWeek9Picks?.length || 0}`);
    if (allWeek9Picks && allWeek9Picks.length > 0) {
      console.log('\nRaw pick data:');
      allWeek9Picks.forEach(p => {
        console.log(JSON.stringify(p, null, 2));
      });
    }
  }

  // Check games table directly
  console.log('\n\n2. Checking games table:');
  console.log('='.repeat(80));
  const { data: allGames, error: gamesError } = await supabase
    .from('games')
    .select('*')
    .limit(5);

  if (gamesError) {
    console.log('Error fetching games:', gamesError);
  } else {
    console.log(`Sample games in database: ${allGames?.length || 0}`);
    if (allGames && allGames.length > 0) {
      console.log('\nSample game:');
      console.log(JSON.stringify(allGames[0], null, 2));
    }
  }

  // Count games by week
  const { data: weekCount } = await supabase
    .from('games')
    .select('week, season_year');

  if (weekCount) {
    const counts = {};
    weekCount.forEach(g => {
      const key = `${g.season_year}-W${g.week}`;
      counts[key] = (counts[key] || 0) + 1;
    });

    console.log('\n\nGames by week:');
    Object.keys(counts).sort().forEach(key => {
      console.log(`  ${key}: ${counts[key]} games`);
    });
  }

  // Check league members
  console.log('\n\n3. Checking league members:');
  console.log('='.repeat(80));
  const { data: members } = await supabase
    .from('league_members')
    .select('*, users(id, username, display_name)')
    .eq('league_id', LEAGUE_ID);

  if (members) {
    console.log(`Total members: ${members.length}`);
    console.log(`Alive: ${members.filter(m => !m.is_eliminated).length}`);
    console.log(`Eliminated: ${members.filter(m => m.is_eliminated).length}`);

    console.log('\nLives distribution:');
    const livesCounts = {};
    members.forEach(m => {
      if (!m.is_eliminated) {
        livesCounts[m.lives_remaining] = (livesCounts[m.lives_remaining] || 0) + 1;
      }
    });
    Object.keys(livesCounts).sort().reverse().forEach(lives => {
      console.log(`  ${lives} ${lives == 1 ? 'life' : 'lives'}: ${livesCounts[lives]} players`);
    });
  }
}

rawCheck().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
