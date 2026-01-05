const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://cggoycedsybrajvdqjjk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
);

async function updateDalGame() {
  console.log('🏈 Updating DAL @ LV to 33-16 FINAL\n');

  // Find the game
  const { data: games } = await supabase
    .from('games')
    .select('*, home_team:teams!games_home_team_id_fkey(key), away_team:teams!games_away_team_id_fkey(key)')
    .eq('week', 11)
    .eq('season_year', 2025);

  const dalGame = games.find(g => g.away_team.key === 'DAL' || g.home_team.key === 'DAL');

  if (!dalGame) {
    console.log('❌ DAL game not found!');
    return;
  }

  console.log(`Found game: ${dalGame.away_team.key} @ ${dalGame.home_team.key}`);

  const isDalAway = dalGame.away_team.key === 'DAL';
  const updateData = {
    away_score: isDalAway ? 33 : 16,
    home_score: isDalAway ? 16 : 33,
    is_final: true,
    game_status: 'Final'
  };

  const { error } = await supabase
    .from('games')
    .update(updateData)
    .eq('id', dalGame.id);

  if (error) {
    console.log('❌ Error:', error.message);
  } else {
    console.log('✅ Game updated successfully!');
    console.log(`   ${dalGame.away_team.key} ${updateData.away_score} @ ${dalGame.home_team.key} ${updateData.home_score} - FINAL\n`);
  }
}

updateDalGame().then(() => process.exit(0));
