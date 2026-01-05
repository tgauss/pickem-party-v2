const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://cggoycedsybrajvdqjjk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ295Y2Vkc3licmFqdmRxamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzIxMzcsImV4cCI6MjA3MjA0ODEzN30.o_G6QQrQVvDZFRNZvVf8qEv5NExq-ZVDkExlZLrXj34'
);

const LEAGUE_ID = 'ce87e7df-2aa1-460e-b48f-0f2c0a905643';

async function verifyWeek9() {
  console.log('✅ WEEK 9 VERIFICATION REPORT\n');

  // Get all Week 9 games
  const { data: games } = await supabase
    .from('games')
    .select(`
      *,
      home_team:teams!games_home_team_id_fkey(team_id, key, city, name),
      away_team:teams!games_away_team_id_fkey(team_id, key, city, name)
    `)
    .eq('season_year', 2025)
    .eq('week', 9)
    .order('game_time');

  console.log('WEEK 9 GAMES STATUS:');
  console.log('='.repeat(80));
  if (games) {
    console.log(`Total games: ${games.length}`);
    console.log(`Final games: ${games.filter(g => g.is_final).length}`);
    console.log(`Non-final games: ${games.filter(g => !g.is_final).length}\n`);

    games.forEach(g => {
      const status = g.is_final ? '✅' : '⏳';
      console.log(`${status} ${g.away_team.key.padEnd(4)} @ ${g.home_team.key.padEnd(4)}: ${g.away_score}-${g.home_score} ${g.is_final ? 'FINAL' : 'NOT FINAL'}`);
    });
  }

  // Get all Week 9 picks with full details
  const { data: picks } = await supabase
    .from('picks')
    .select(`
      *,
      users(id, username, display_name),
      teams(team_id, key, city, name),
      games(
        id,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        is_final,
        home_team:teams!games_home_team_id_fkey(key, name),
        away_team:teams!games_away_team_id_fkey(key, name)
      )
    `)
    .eq('league_id', LEAGUE_ID)
    .eq('week', 9);

  console.log('\n\nWEEK 9 PICKS & RESULTS:');
  console.log('='.repeat(80));
  if (picks) {
    picks.forEach(p => {
      const game = p.games;
      const result = p.is_correct ? '✅ WIN' : '❌ LOSS';
      const gameInfo = game ? `${game.away_team.key} @ ${game.home_team.key} (${game.away_score}-${game.home_score})` : 'NO GAME';
      console.log(`${p.users.display_name.padEnd(25)} picked ${p.teams.key.padEnd(4)} in ${gameInfo.padEnd(30)} ${result}`);
    });
  }

  // Get the user who lost (Jaren)
  const losingPick = picks?.find(p => p.is_correct === false);
  if (losingPick) {
    console.log('\n\nLOSING PICK ANALYSIS:');
    console.log('='.repeat(80));
    console.log(`Player: ${losingPick.users.display_name}`);
    console.log(`User ID: ${losingPick.users.id}`);
    console.log(`Picked: ${losingPick.teams.key} (${losingPick.teams.name})`);

    // Check their member status
    const { data: member } = await supabase
      .from('league_members')
      .select('*')
      .eq('league_id', LEAGUE_ID)
      .eq('user_id', losingPick.users.id)
      .single();

    if (member) {
      console.log(`\nMember Status:`);
      console.log(`  Lives remaining: ${member.lives_remaining}`);
      console.log(`  Eliminated: ${member.is_eliminated}`);
      console.log(`  Eliminated week: ${member.eliminated_week || 'N/A'}`);

      // Check if life deduction was applied
      console.log(`\nLife Deduction Status:`);
      if (member.lives_remaining === 0 && member.is_eliminated && member.eliminated_week === 9) {
        console.log('  ✅ Life deducted and player eliminated in Week 9');
      } else if (member.lives_remaining === 0 && !member.is_eliminated) {
        console.log('  ⚠️  Lives at 0 but not marked as eliminated!');
      } else if (member.lives_remaining > 0) {
        console.log(`  ⚠️  Player still has ${member.lives_remaining} life/lives - deduction may not have been applied!`);
      }
    }
  }

  // Summary of alive vs picks
  const { data: members } = await supabase
    .from('league_members')
    .select('*, users(id, display_name)')
    .eq('league_id', LEAGUE_ID)
    .eq('is_eliminated', false);

  console.log('\n\nALIVE PLAYERS CHECK:');
  console.log('='.repeat(80));
  console.log(`Total alive members: ${members?.length || 0}`);
  console.log(`Total Week 9 picks: ${picks?.length || 0}\n`);

  if (members && picks) {
    const memberIds = new Set(members.map(m => m.user_id));
    const pickerIds = new Set(picks.map(p => p.user_id));

    // Check for alive members without picks
    const missingPicks = members.filter(m => !pickerIds.has(m.user_id));
    if (missingPicks.length > 0) {
      console.log('⚠️  Alive members WITHOUT Week 9 picks (should be eliminated):');
      missingPicks.forEach(m => {
        console.log(`  - ${m.users.display_name} (${m.lives_remaining} ${m.lives_remaining === 1 ? 'life' : 'lives'})`);
      });
    }

    // Check for picks from eliminated members
    const eliminatedWithPicks = picks.filter(p => !memberIds.has(p.user_id));
    if (eliminatedWithPicks.length > 0) {
      console.log('\n⚠️  Picks from ELIMINATED members:');
      eliminatedWithPicks.forEach(p => {
        console.log(`  - ${p.users.display_name}`);
      });
    }

    if (missingPicks.length === 0 && eliminatedWithPicks.length === 0) {
      console.log('✅ All alive members have picks, no picks from eliminated members');
    }
  }

  console.log('\n\nFINAL STANDINGS AFTER WEEK 9:');
  console.log('='.repeat(80));
  const { data: allMembers } = await supabase
    .from('league_members')
    .select('*, users(display_name)')
    .eq('league_id', LEAGUE_ID)
    .order('is_eliminated', { ascending: true })
    .order('lives_remaining', { ascending: false });

  if (allMembers) {
    const alive = allMembers.filter(m => !m.is_eliminated);
    const eliminated = allMembers.filter(m => m.is_eliminated);

    console.log(`\nAlive (${alive.length}):`);
    alive.forEach(m => {
      console.log(`  ${m.users.display_name.padEnd(25)} ${m.lives_remaining} ${m.lives_remaining === 1 ? 'life' : 'lives'}`);
    });

    console.log(`\nEliminated (${eliminated.length}):`);
    const week9Elims = eliminated.filter(e => e.eliminated_week === 9);
    if (week9Elims.length > 0) {
      console.log(`\n  💀 Week 9 Eliminations (${week9Elims.length}):`);
      week9Elims.forEach(m => {
        console.log(`    - ${m.users.display_name}`);
      });
    }

    const otherElims = eliminated.filter(e => e.eliminated_week !== 9);
    console.log(`\n  Previous Weeks (${otherElims.length}):`);
    otherElims.forEach(m => {
      console.log(`    - ${m.users.display_name} (Week ${m.eliminated_week || '?'})`);
    });
  }
}

verifyWeek9().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
