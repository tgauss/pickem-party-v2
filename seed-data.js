// Quick seed script for development
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = 'https://cggoycedsybrajvdqjjk.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'your-service-key'
const supabase = createClient(supabaseUrl, supabaseKey)

async function seedData() {
  console.log('🏈 Seeding NFL data...')
  
  // Read team data
  const teamData = JSON.parse(fs.readFileSync('./nfl-team-info.json', 'utf8'))
  const scheduleData = JSON.parse(fs.readFileSync('./2025-nfl-schedule.json', 'utf8'))
  
  // Seed teams
  console.log('📊 Inserting teams...')
  const teams = teamData.map(team => ({
    team_id: team.TeamID,
    key: team.Key,
    city: team.City,
    name: team.Name,
    full_name: team.FullName,
    conference: team.Conference,
    division: team.Division,
    primary_color: team.PrimaryColor,
    secondary_color: team.SecondaryColor,
    tertiary_color: team.TertiaryColor,
    quaternary_color: team.QuaternaryColor,
    logo_url: team.WikipediaLogoURL,
    wordmark_url: team.WikipediaWordMarkURL,
    bye_week: team.ByeWeek,
    head_coach: team.HeadCoach
  }))
  
  const { error: teamError } = await supabase.from('teams').insert(teams)
  if (teamError) console.error('Team insert error:', teamError)
  else console.log(`✅ Inserted ${teams.length} teams`)
  
  // Seed Week 1 games only for MVP
  console.log('🏆 Inserting Week 1 games...')
  const week1Games = scheduleData
    .filter(game => game.Week === 1 && game.Season === 2025)
    .map(game => ({
      sports_data_game_id: game.GameID,
      season_year: game.Season,
      week: game.Week,
      home_team_id: game.HomeTeamID,
      away_team_id: game.AwayTeamID,
      game_time: game.DateTime,
      is_final: false
    }))
  
  const { error: gameError } = await supabase.from('games').insert(week1Games)
  if (gameError) console.error('Game insert error:', gameError)
  else console.log(`✅ Inserted ${week1Games.length} Week 1 games`)
  
  console.log('🎮 Data seeding complete! Ready to FIGHT!')
}

seedData().catch(console.error)