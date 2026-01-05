const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://cggoycedsybrajvdqjjk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
);

// CORRECT Team IDs using team_id field (NOT id field!)
// The games table FK references teams.team_id
const teams = {
  LAR: 14,  // Rams
  CAR: 29,  // Panthers
  GB: 9,    // Packers
  CHI: 3,   // Bears
  BUF: 2,   // Bills
  JAX: 30,  // Jaguars
  SF: 25,   // 49ers
  PHI: 21,  // Eagles
  LAC: 24,  // Chargers
  NE: 17,   // Patriots
  HOU: 34,  // Texans
  PIT: 23   // Steelers
};

// Wild Card Games from ESPN API
const wildcardGames = [
  {
    away_team_id: teams.LAR,  // Rams
    home_team_id: teams.CAR,  // Panthers
    game_time: '2026-01-10T21:30:00Z',
    espn_event_id: 'wc2025_lar_car_v2'
  },
  {
    away_team_id: teams.GB,   // Packers
    home_team_id: teams.CHI,  // Bears
    game_time: '2026-01-11T01:00:00Z',
    espn_event_id: 'wc2025_gb_chi_v2'
  },
  {
    away_team_id: teams.BUF,  // Bills
    home_team_id: teams.JAX,  // Jaguars
    game_time: '2026-01-11T18:00:00Z',
    espn_event_id: 'wc2025_buf_jax_v2'
  },
  {
    away_team_id: teams.SF,   // 49ers
    home_team_id: teams.PHI,  // Eagles
    game_time: '2026-01-11T21:30:00Z',
    espn_event_id: 'wc2025_sf_phi_v2'
  },
  {
    away_team_id: teams.LAC,  // Chargers
    home_team_id: teams.NE,   // Patriots
    game_time: '2026-01-12T01:00:00Z',
    espn_event_id: 'wc2025_lac_ne_v2'
  },
  {
    away_team_id: teams.HOU,  // Texans
    home_team_id: teams.PIT,  // Steelers
    game_time: '2026-01-13T01:15:00Z',
    espn_event_id: 'wc2025_hou_pit_v2'
  }
];

async function fixWildcard() {
  console.log('=== FIXING WILD CARD WEEK 19 (with correct team_id references) ===\n');

  // First, delete all existing Week 19 games
  console.log('Deleting existing Week 19 games...');
  const { error: deleteError } = await supabase
    .from('games')
    .delete()
    .eq('week', 19)
    .eq('season_year', 2025);

  if (deleteError) {
    console.error('Error deleting games:', deleteError);
    return;
  }
  console.log('✅ Deleted existing Week 19 games\n');

  // Insert correct Wild Card games
  console.log('Adding Wild Card games with correct team_id values...\n');

  for (const game of wildcardGames) {
    const gameData = {
      season_year: 2025,
      week: 19,
      away_team_id: game.away_team_id,
      home_team_id: game.home_team_id,
      game_time: game.game_time,
      home_score: null,
      away_score: null,
      is_final: false,
      espn_event_id: game.espn_event_id,
      game_status: 'Scheduled'
    };

    const { data, error } = await supabase
      .from('games')
      .insert(gameData)
      .select();

    if (error) {
      console.error(`Error inserting game:`, error);
    } else {
      // Get team names for display
      const { data: awayTeam } = await supabase
        .from('teams')
        .select('name, key')
        .eq('team_id', game.away_team_id)
        .single();

      const { data: homeTeam } = await supabase
        .from('teams')
        .select('name, key')
        .eq('team_id', game.home_team_id)
        .single();

      console.log(`✅ Added: ${awayTeam.name} (${awayTeam.key}) @ ${homeTeam.name} (${homeTeam.key})`);
    }
  }

  // Verify all games
  console.log('\n=== WEEK 19 WILD CARD SCHEDULE ===\n');
  const { data: allGames } = await supabase
    .from('games')
    .select(`
      game_time,
      game_status,
      away_team:teams!games_away_team_id_fkey(name, key),
      home_team:teams!games_home_team_id_fkey(name, key)
    `)
    .eq('week', 19)
    .eq('season_year', 2025)
    .order('game_time');

  if (allGames) {
    for (const g of allGames) {
      const gameDate = new Date(g.game_time);
      const dateStr = gameDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const timeStr = gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      console.log(`  ${g.away_team.key} @ ${g.home_team.key} - ${dateStr} ${timeStr}`);
    }
    console.log(`\n✅ Total: ${allGames.length} Wild Card games ready for picks!`);
  }
}

fixWildcard();
