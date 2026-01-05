const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://cggoycedsybrajvdqjjk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
);

// Team IDs from database
const teams = {
  LAR: 30,  // Rams
  CAR: 26,  // Panthers
  GB: 23,   // Packers
  CHI: 21,  // Bears
  BUF: 1,   // Bills
  JAX: 11,  // Jaguars
  SF: 31,   // 49ers
  PHI: 19,  // Eagles
  LAC: 16,  // Chargers
  NE: 3,    // Patriots
  HOU: 9,   // Texans
  PIT: 8    // Steelers
};

// Wild Card Games from ESPN API
const wildcardGames = [
  {
    away_team_id: teams.LAR,  // Rams
    home_team_id: teams.CAR,  // Panthers
    game_time: '2026-01-10T21:30:00Z',
    espn_event_id: 'wc2025_lar_car'
  },
  {
    away_team_id: teams.GB,   // Packers
    home_team_id: teams.CHI,  // Bears
    game_time: '2026-01-11T01:00:00Z',
    espn_event_id: 'wc2025_gb_chi'
  },
  {
    away_team_id: teams.BUF,  // Bills
    home_team_id: teams.JAX,  // Jaguars
    game_time: '2026-01-11T18:00:00Z',
    espn_event_id: 'wc2025_buf_jax'
  },
  {
    away_team_id: teams.SF,   // 49ers
    home_team_id: teams.PHI,  // Eagles
    game_time: '2026-01-11T21:30:00Z',
    espn_event_id: 'wc2025_sf_phi'
  },
  {
    away_team_id: teams.LAC,  // Chargers
    home_team_id: teams.NE,   // Patriots
    game_time: '2026-01-12T01:00:00Z',
    espn_event_id: 'wc2025_lac_ne'
  },
  {
    away_team_id: teams.HOU,  // Texans
    home_team_id: teams.PIT,  // Steelers
    game_time: '2026-01-13T01:15:00Z',
    espn_event_id: 'wc2025_hou_pit'
  }
];

async function addWildcardWeek() {
  console.log('=== ADDING WILD CARD PLAYOFF WEEK (Week 19) ===\n');

  // First check if Week 19 games already exist
  const { data: existingGames } = await supabase
    .from('games')
    .select('id')
    .eq('week', 19)
    .eq('season_year', 2025);

  if (existingGames && existingGames.length > 0) {
    console.log(`Week 19 already has ${existingGames.length} games. Skipping creation.`);
    return;
  }

  // Insert Wild Card games as Week 19
  for (const game of wildcardGames) {
    const gameData = {
      season_year: 2025,
      week: 19,  // Wild Card = Week 19
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
        .select('name')
        .eq('id', game.away_team_id)
        .single();

      const { data: homeTeam } = await supabase
        .from('teams')
        .select('name')
        .eq('id', game.home_team_id)
        .single();

      console.log(`✅ Added: ${awayTeam.name} @ ${homeTeam.name}`);
    }
  }

  console.log('\n=== WILD CARD WEEK 19 CREATED ===\n');

  // Verify games were added
  const { data: newGames } = await supabase
    .from('games')
    .select(`
      week,
      game_time,
      game_status,
      away_team:teams!games_away_team_id_fkey(name),
      home_team:teams!games_home_team_id_fkey(name)
    `)
    .eq('week', 19)
    .eq('season_year', 2025)
    .order('game_time');

  if (newGames) {
    console.log('Week 19 Games:');
    for (const g of newGames) {
      const gameDate = new Date(g.game_time);
      console.log(`  ${g.away_team.name} @ ${g.home_team.name} - ${gameDate.toLocaleString()}`);
    }
    console.log(`\nTotal: ${newGames.length} games`);
  }
}

addWildcardWeek();
