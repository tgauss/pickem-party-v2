const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://cggoycedsybrajvdqjjk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
);

(async () => {
  const { data: teams } = await supabase.from('teams').select('*');
  const teamMap = new Map(teams.map(t => [t.team_id, t]));

  console.log('📊 CHECKING WEEK 9 FOR DUPLICATES\n');

  const { data: games } = await supabase
    .from('games')
    .select('id, home_team_id, away_team_id, game_time, espn_event_id')
    .eq('season_year', 2025)
    .eq('week', 9)
    .order('game_time');

  console.log(`Total Week 9 games: ${games.length}\n`);

  const matchups = new Map();
  games.forEach(g => {
    const away = teamMap.get(g.away_team_id);
    const home = teamMap.get(g.home_team_id);
    const key = `${away.key} @ ${home.key}`;

    if (!matchups.has(key)) {
      matchups.set(key, []);
    }
    matchups.get(key).push({ id: g.id, espn: g.espn_event_id });
  });

  console.log(`Unique matchups: ${matchups.size}\n`);

  let duplicateCount = 0;
  matchups.forEach((games, matchup) => {
    if (games.length > 1) {
      duplicateCount += games.length - 1;
      console.log(`⚠️  ${matchup}: ${games.length} copies`);
      games.forEach(g => console.log(`   - ID: ${g.id.slice(0, 8)}... ESPN: ${g.espn || 'none'}`));
    }
  });

  console.log(`\n📋 Summary:`);
  console.log(`- Unique games: ${matchups.size}`);
  console.log(`- Total in DB: ${games.length}`);
  console.log(`- Duplicates: ${duplicateCount}`);
  console.log(`- Should delete: ${duplicateCount} games`);
})();
