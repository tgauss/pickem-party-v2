const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://cggoycedsybrajvdqjjk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
);

async function addSFPHIGame() {
  console.log('=== ADDING SF @ PHI GAME ===\n');

  // First verify teams exist
  const { data: sfTeam } = await supabase
    .from('teams')
    .select('id, key, name')
    .eq('key', 'SF')
    .single();

  const { data: phiTeam } = await supabase
    .from('teams')
    .select('id, key, name')
    .eq('key', 'PHI')
    .single();

  console.log('SF Team:', sfTeam);
  console.log('PHI Team:', phiTeam);

  if (!sfTeam || !phiTeam) {
    console.error('Teams not found!');
    return;
  }

  // Insert the game
  const gameData = {
    season_year: 2025,
    week: 19,
    away_team_id: sfTeam.id,  // 49ers
    home_team_id: phiTeam.id, // Eagles
    game_time: '2026-01-11T21:30:00Z',
    home_score: null,
    away_score: null,
    is_final: false,
    espn_event_id: 'wc2025_sf_phi',
    game_status: 'Scheduled'
  };

  console.log('\nInserting game with data:', gameData);

  const { data, error } = await supabase
    .from('games')
    .insert(gameData)
    .select();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('\n✅ Added: 49ers @ Eagles');
    console.log('Game data:', data);
  }

  // Show all Week 19 games
  console.log('\n=== ALL WEEK 19 GAMES ===\n');
  const { data: allGames } = await supabase
    .from('games')
    .select(`
      game_time,
      away_team:teams!games_away_team_id_fkey(name, key),
      home_team:teams!games_home_team_id_fkey(name, key)
    `)
    .eq('week', 19)
    .eq('season_year', 2025)
    .order('game_time');

  if (allGames) {
    for (const g of allGames) {
      const gameDate = new Date(g.game_time);
      console.log(`${g.away_team.key} @ ${g.home_team.key} - ${gameDate.toLocaleDateString()} ${gameDate.toLocaleTimeString()}`);
    }
    console.log(`\nTotal: ${allGames.length} Wild Card games`);
  }
}

addSFPHIGame();
