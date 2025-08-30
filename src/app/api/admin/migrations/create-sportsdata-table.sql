-- Create table for raw SportsData.io game data
CREATE TABLE IF NOT EXISTS sportsdata_games (
  -- Primary identification
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  game_id INTEGER UNIQUE NOT NULL, -- SportsData GameID
  game_key TEXT UNIQUE NOT NULL, -- SportsData GameKey (e.g., "202410116")
  
  -- Game scheduling
  season_type INTEGER NOT NULL, -- 1=Regular, 2=Preseason, 3=Postseason
  season INTEGER NOT NULL, -- Year (e.g., 2024)
  week INTEGER NOT NULL, -- Week number
  date TIMESTAMPTZ NOT NULL, -- Game date/time
  
  -- Teams
  away_team TEXT NOT NULL, -- Team key (e.g., "BAL")
  home_team TEXT NOT NULL, -- Team key (e.g., "KC")
  
  -- Scores
  away_score INTEGER,
  home_score INTEGER,
  
  -- Quarter scores
  away_score_q1 INTEGER,
  away_score_q2 INTEGER,
  away_score_q3 INTEGER,
  away_score_q4 INTEGER,
  away_score_ot INTEGER,
  home_score_q1 INTEGER,
  home_score_q2 INTEGER,
  home_score_q3 INTEGER,
  home_score_q4 INTEGER,
  home_score_ot INTEGER,
  
  -- Game status
  quarter TEXT, -- Current quarter (1,2,3,4,OT,F,FO)
  time_remaining TEXT, -- Time left in quarter
  possession TEXT, -- Team with possession
  down INTEGER, -- Current down
  distance TEXT, -- Yards to go
  yard_line INTEGER, -- Field position
  yard_line_territory TEXT, -- Which side of field
  red_zone BOOLEAN DEFAULT FALSE,
  
  -- Betting lines
  point_spread DECIMAL(3,1), -- Spread
  over_under DECIMAL(4,1), -- Total points O/U
  
  -- Broadcast
  channel TEXT, -- TV channel
  
  -- Status flags
  status TEXT, -- Game status (Scheduled, InProgress, Final, etc.)
  is_final BOOLEAN DEFAULT FALSE,
  is_final_overtime BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  raw_data JSONB, -- Complete API response for reference
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ, -- When we last fetched from API
  
  -- Indexes for common queries
  CONSTRAINT valid_season_type CHECK (season_type IN (1, 2, 3)),
  CONSTRAINT valid_week CHECK (week >= 0 AND week <= 22)
);

-- Create indexes for performance
CREATE INDEX idx_sportsdata_games_season_week ON sportsdata_games(season, week);
CREATE INDEX idx_sportsdata_games_teams ON sportsdata_games(home_team, away_team);
CREATE INDEX idx_sportsdata_games_date ON sportsdata_games(date);
CREATE INDEX idx_sportsdata_games_status ON sportsdata_games(status, is_final);

-- Create a view for easy access to current season games
CREATE OR REPLACE VIEW current_season_games AS
SELECT * FROM sportsdata_games 
WHERE season = EXTRACT(YEAR FROM CURRENT_DATE)
ORDER BY week, date;

-- Function to sync with our main games table
CREATE OR REPLACE FUNCTION sync_sportsdata_to_games()
RETURNS INTEGER AS $$
DECLARE
  synced_count INTEGER := 0;
  game_record RECORD;
BEGIN
  -- Loop through sportsdata games that need syncing
  FOR game_record IN 
    SELECT 
      sg.*,
      ht.team_id as home_team_id,
      at.team_id as away_team_id
    FROM sportsdata_games sg
    JOIN teams ht ON ht.key = sg.home_team
    JOIN teams at ON at.key = sg.away_team
    WHERE sg.is_final = true
    AND NOT EXISTS (
      SELECT 1 FROM games g 
      WHERE g.sports_data_game_id = sg.game_id
    )
  LOOP
    -- Insert into games table
    INSERT INTO games (
      sports_data_game_id,
      season_year,
      week,
      home_team_id,
      away_team_id,
      game_time,
      home_score,
      away_score,
      is_final
    ) VALUES (
      game_record.game_id,
      game_record.season,
      game_record.week,
      game_record.home_team_id,
      game_record.away_team_id,
      game_record.date,
      game_record.home_score,
      game_record.away_score,
      game_record.is_final
    );
    
    synced_count := synced_count + 1;
  END LOOP;
  
  RETURN synced_count;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON TABLE sportsdata_games IS 'Raw game data from SportsData.io API - source of truth for NFL game information';
COMMENT ON COLUMN sportsdata_games.raw_data IS 'Complete JSON response from API for debugging and future field additions';
COMMENT ON FUNCTION sync_sportsdata_to_games() IS 'Syncs finalized games from sportsdata_games to main games table';