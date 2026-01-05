const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fixWeek(weekNum) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔧 FIXING WEEK ${weekNum}`);
  console.log('='.repeat(60));

  // Fetch ESPN schedule for this week
  const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${weekNum}&seasontype=2&dates=2025`;
  const response = await fetch(espnUrl);
  const espnData = await response.json();

  console.log(`\nESPN says Week ${weekNum} has ${espnData.events.length} games`);

  // Get team mappings
  const { data: teams } = await supabase.from('teams').select('*');
  const teamMap = new Map(teams.map(t => [t.key, t.team_id]));

  // Get current games in database
  const { data: currentGames } = await supabase
    .from('games')
    .select('*')
    .eq('season_year', 2025)
    .eq('week', weekNum);

  console.log(`Database currently has ${currentGames.length} games`);

  // Check for any picks on this week
  const { data: picks } = await supabase
    .from('picks')
    .select('id, user_id, team_id')
    .eq('week', weekNum);

  if (picks && picks.length > 0) {
    console.log(`⚠️  WARNING: ${picks.length} picks exist for Week ${weekNum}`);
    console.log(`   Skipping this week to avoid breaking picks!`);
    return { skipped: true, reason: 'Has existing picks' };
  }

  // Build correct games list from ESPN
  const correctGames = [];
  for (const event of espnData.events) {
    const comp = event.competitions[0];
    const home = comp.competitors.find(c => c.homeAway === 'home');
    const away = comp.competitors.find(c => c.homeAway === 'away');

    const homeKey = home.team.abbreviation;
    const awayKey = away.team.abbreviation;
    const homeId = teamMap.get(homeKey);
    const awayId = teamMap.get(awayKey);

    if (!homeId || !awayId) {
      console.log(`  ⚠️  Unknown team: ${awayKey} @ ${homeKey}`);
      continue;
    }

    correctGames.push({
      homeId,
      awayId,
      homeKey,
      awayKey,
      gameTime: event.date,
      espnId: event.id,
      status: comp.status?.type?.description || 'Scheduled',
      isFinal: comp.status?.type?.completed || false,
      homeScore: parseInt(home.score) || null,
      awayScore: parseInt(away.score) || null
    });
  }

  // Identify games to keep
  const correctGameIds = new Set();
  const gamesToDelete = [];

  for (const correctGame of correctGames) {
    const existing = currentGames.find(g =>
      g.home_team_id === correctGame.homeId && g.away_team_id === correctGame.awayId
    );

    if (existing) {
      correctGameIds.add(existing.id);
    }
  }

  // Mark games for deletion
  currentGames.forEach(g => {
    if (!correctGameIds.has(g.id)) {
      gamesToDelete.push(g);
    }
  });

  console.log(`\n📋 Summary:`);
  console.log(`- Correct games from ESPN: ${correctGames.length}`);
  console.log(`- Games to keep: ${correctGameIds.size}`);
  console.log(`- Games to delete: ${gamesToDelete.length}`);
  console.log(`- Games to insert: ${correctGames.length - correctGameIds.size}`);

  // Delete incorrect games
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
        console.log(`  ✓ Deleted ${away?.key} @ ${home?.key}`);
      }
    }
  }

  // Update/Insert correct games
  console.log(`\n📥 Syncing correct games from ESPN...`);
  for (const correctGame of correctGames) {
    // Check if exists
    const { data: existing } = await supabase
      .from('games')
      .select('*')
      .eq('season_year', 2025)
      .eq('week', weekNum)
      .eq('home_team_id', correctGame.homeId)
      .eq('away_team_id', correctGame.awayId)
      .single();

    if (existing) {
      // Update
      const { error } = await supabase
        .from('games')
        .update({
          game_time: correctGame.gameTime,
          espn_event_id: correctGame.espnId,
          game_status: correctGame.status,
          is_final: correctGame.isFinal,
          home_score: correctGame.homeScore,
          away_score: correctGame.awayScore,
          last_updated: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (error && !error.message.includes('duplicate key')) {
        console.log(`  ✗ Update ${correctGame.awayKey} @ ${correctGame.homeKey}: ${error.message}`);
      } else {
        console.log(`  ✓ Updated ${correctGame.awayKey} @ ${correctGame.homeKey}`);
      }
    } else {
      // Insert
      const { error } = await supabase
        .from('games')
        .insert({
          season_year: 2025,
          week: weekNum,
          home_team_id: correctGame.homeId,
          away_team_id: correctGame.awayId,
          game_time: correctGame.gameTime,
          espn_event_id: correctGame.espnId,
          game_status: correctGame.status,
          is_final: correctGame.isFinal,
          home_score: correctGame.homeScore,
          away_score: correctGame.awayScore,
          last_updated: new Date().toISOString()
        });

      if (error && !error.message.includes('duplicate key')) {
        console.log(`  ✗ Insert ${correctGame.awayKey} @ ${correctGame.homeKey}: ${error.message}`);
      } else {
        console.log(`  ✓ Inserted ${correctGame.awayKey} @ ${correctGame.homeKey}`);
      }
    }
  }

  // Verify final count
  const { data: finalGames } = await supabase
    .from('games')
    .select('id')
    .eq('season_year', 2025)
    .eq('week', weekNum);

  console.log(`\n✅ Week ${weekNum} now has ${finalGames.length} games (expected ${correctGames.length})`);

  return {
    skipped: false,
    before: currentGames.length,
    after: finalGames.length,
    expected: correctGames.length
  };
}

async function fixAllFutureWeeks() {
  console.log('🚀 FIXING ALL FUTURE WEEKS (9-18)\n');

  const results = {};

  for (let week = 9; week <= 18; week++) {
    try {
      results[week] = await fixWeek(week);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`\n❌ Error fixing Week ${week}:`, error.message);
      results[week] = { error: error.message };
    }
  }

  console.log('\n\n' + '='.repeat(60));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(60));

  for (let week = 9; week <= 18; week++) {
    const result = results[week];
    if (result.skipped) {
      console.log(`Week ${week}: SKIPPED (${result.reason})`);
    } else if (result.error) {
      console.log(`Week ${week}: ERROR - ${result.error}`);
    } else {
      const status = result.after === result.expected ? '✅' : '⚠️';
      console.log(`Week ${week}: ${result.before} → ${result.after} games ${status}`);
    }
  }
}

fixAllFutureWeeks().then(() => {
  console.log('\n✨ All done!');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
