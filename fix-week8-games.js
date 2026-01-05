const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Correct Week 8 matchups based on ESPN API
const CORRECT_WEEK_8_GAMES = [
  { away: 'MIN', home: 'LAC', time: '2025-10-24T00:15:00Z', espnId: '401772941' }, // Thu Night (already played)
  { away: 'MIA', home: 'ATL', time: '2025-10-26T17:00:00Z', espnId: '401772943' },
  { away: 'NYJ', home: 'CIN', time: '2025-10-26T17:00:00Z', espnId: '401772944' },
  { away: 'CLE', home: 'NE', time: '2025-10-26T17:00:00Z', espnId: '401772945' },
  { away: 'NYG', home: 'PHI', time: '2025-10-26T17:00:00Z', espnId: '401772946' },
  { away: 'BUF', home: 'CAR', time: '2025-10-26T17:00:00Z', espnId: '401772947' },
  { away: 'CHI', home: 'BAL', time: '2025-10-26T17:00:00Z', espnId: '401772948' },
  { away: 'SF', home: 'HOU', time: '2025-10-26T17:00:00Z', espnId: '401772949' },
  { away: 'TB', home: 'NO', time: '2025-10-26T20:05:00Z', espnId: '401772950' },
  { away: 'DAL', home: 'DEN', time: '2025-10-26T20:25:00Z', espnId: '401772951' },
  { away: 'TEN', home: 'IND', time: '2025-10-26T20:25:00Z', espnId: '401772952' },
  { away: 'GB', home: 'PIT', time: '2025-10-27T00:20:00Z', espnId: '401772953' }, // Sun Night
  { away: 'WSH', home: 'KC', time: '2025-10-28T00:15:00Z', espnId: '401772954' }  // Mon Night
];

async function fixWeek8Games() {
  console.log('🔧 FIXING WEEK 8 GAMES\n');

  // Step 1: Get team mappings
  const { data: teams } = await supabase.from('teams').select('*');
  const teamMap = new Map();
  teams.forEach(t => {
    teamMap.set(t.key, t.team_id);
  });

  // Step 2: Get all current Week 8 games
  const { data: currentGames } = await supabase
    .from('games')
    .select('*')
    .eq('season_year', 2025)
    .eq('week', 8);

  console.log(`Found ${currentGames.length} existing Week 8 games`);

  // Step 3: Identify which games to keep and which to delete
  const correctGameIds = new Set();
  const gamesToDelete = [];

  for (const correctGame of CORRECT_WEEK_8_GAMES) {
    const homeTeamId = teamMap.get(correctGame.home);
    const awayTeamId = teamMap.get(correctGame.away);

    // Find if this game already exists
    const existing = currentGames.find(g =>
      g.home_team_id === homeTeamId && g.away_team_id === awayTeamId
    );

    if (existing) {
      correctGameIds.add(existing.id);
      console.log(`✓ Keeping: ${correctGame.away} @ ${correctGame.home} (${existing.id})`);
    }
  }

  // Mark games for deletion
  currentGames.forEach(g => {
    if (!correctGameIds.has(g.id)) {
      gamesToDelete.push(g);
    }
  });

  console.log(`\n📋 Summary:`);
  console.log(`- Games to keep: ${correctGameIds.size}`);
  console.log(`- Games to delete: ${gamesToDelete.length}`);

  // Step 4: Delete incorrect games
  if (gamesToDelete.length > 0) {
    console.log(`\n🗑️  Deleting ${gamesToDelete.length} incorrect games...`);

    for (const game of gamesToDelete) {
      const home = teams.find(t => t.team_id === game.home_team_id);
      const away = teams.find(t => t.team_id === game.away_team_id);

      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', game.id);

      if (error) {
        console.log(`  ✗ Failed to delete ${away?.key} @ ${home?.key}: ${error.message}`);
      } else {
        console.log(`  ✓ Deleted ${away?.key} @ ${home?.key} (${game.id})`);
      }
    }
  }

  // Step 5: Update/Insert correct games
  console.log(`\n📥 Updating/Inserting correct Week 8 games...\n`);

  for (const correctGame of CORRECT_WEEK_8_GAMES) {
    const homeTeamId = teamMap.get(correctGame.home);
    const awayTeamId = teamMap.get(correctGame.away);

    // Check if game exists
    const { data: existing } = await supabase
      .from('games')
      .select('*')
      .eq('season_year', 2025)
      .eq('week', 8)
      .eq('home_team_id', homeTeamId)
      .eq('away_team_id', awayTeamId)
      .single();

    if (existing) {
      // Update existing game
      const { error } = await supabase
        .from('games')
        .update({
          game_time: correctGame.time,
          espn_event_id: correctGame.espnId,
          last_updated: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (error) {
        console.log(`  ✗ Failed to update ${correctGame.away} @ ${correctGame.home}: ${error.message}`);
      } else {
        console.log(`  ✓ Updated ${correctGame.away} @ ${correctGame.home}`);
      }
    } else {
      // Insert new game
      const { error } = await supabase
        .from('games')
        .insert({
          season_year: 2025,
          week: 8,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          game_time: correctGame.time,
          espn_event_id: correctGame.espnId,
          is_final: false,
          game_status: 'Scheduled',
          home_score: null,
          away_score: null,
          last_updated: new Date().toISOString()
        });

      if (error) {
        console.log(`  ✗ Failed to insert ${correctGame.away} @ ${correctGame.home}: ${error.message}`);
      } else {
        console.log(`  ✓ Inserted ${correctGame.away} @ ${correctGame.home}`);
      }
    }
  }

  // Step 6: Verify final count
  const { data: finalGames } = await supabase
    .from('games')
    .select('id')
    .eq('season_year', 2025)
    .eq('week', 8);

  console.log(`\n✅ Week 8 now has ${finalGames.length} games (should be 13)`);

  // Step 7: Check picks
  const { data: picks } = await supabase
    .from('picks')
    .select('id, users(display_name), teams(key)')
    .eq('week', 8);

  console.log(`\n📊 Week 8 Picks: ${picks?.length || 0}`);
  if (picks && picks.length > 0) {
    picks.forEach(p => console.log(`  - ${p.users.display_name}: ${p.teams.key}`));
  }
}

fixWeek8Games().then(() => {
  console.log('\n✨ Done!');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
