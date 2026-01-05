const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://cggoycedsybrajvdqjjk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
);

(async () => {
  console.log('🔍 CHECKING WEEK 8 GAMES AND ODDS\n');

  // Get all Week 8 games
  const { data: games, error } = await supabase
    .from('games')
    .select('*')
    .eq('season_year', 2025)
    .eq('week', 8)
    .order('game_time', { ascending: true });

  if (error) {
    console.log('ERROR:', error);
    return;
  }

  console.log(`Total Week 8 games found: ${games?.length || 0}\n`);

  if (!games || games.length === 0) {
    console.log('No Week 8 games found in database!');
    return;
  }

  // Get teams
  const { data: teams } = await supabase
    .from('teams')
    .select('*');

  games.forEach((game, idx) => {
    const homeTeam = teams.find(t => t.team_id === game.home_team_id);
    const awayTeam = teams.find(t => t.team_id === game.away_team_id);

    const gameTime = new Date(game.game_time);
    console.log(`${idx + 1}. ${awayTeam?.name || 'Unknown'} @ ${homeTeam?.name || 'Unknown'}`);
    console.log(`   Game Time: ${gameTime.toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`);
    console.log(`   Spread: ${game.spread || 'N/A'}`);
    console.log(`   Favored Team ID: ${game.favored_team_id || 'N/A'}`);

    if (game.favored_team_id) {
      const favoredTeam = game.favored_team_id === game.home_team_id ? homeTeam?.name : awayTeam?.name;
      console.log(`   Favored Team: ${favoredTeam}`);
      console.log(`   Home Team ID: ${game.home_team_id}, Away Team ID: ${game.away_team_id}`);
    }

    console.log(`   Final: ${game.is_final}`);
    console.log('');
  });

  // Check what the current week logic would calculate
  const now = new Date();
  console.log(`\nCurrent time: ${now.toISOString()}`);
  console.log(`Current time ET: ${now.toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
})();
