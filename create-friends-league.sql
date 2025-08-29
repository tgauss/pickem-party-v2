-- Create new test league for friends
INSERT INTO leagues (name, slug, season_year, buy_in_amount, is_public, invite_code, max_participants, commissioner_id)
SELECT 
  'Friends Test - Week 1 Ready' as name,
  'friends-test-week-1-ready' as slug,
  2025 as season_year,
  0 as buy_in_amount,
  true as is_public,
  'FRIEND' || SUBSTR(CAST(RANDOM() AS TEXT), 3, 4) as invite_code,
  50 as max_participants,
  (SELECT id FROM users LIMIT 1) as commissioner_id;

-- Add all users to the new league  
INSERT INTO league_members (league_id, user_id, lives_remaining, is_paid, is_eliminated)
SELECT 
  (SELECT id FROM leagues WHERE slug = 'friends-test-week-1-ready') as league_id,
  u.id as user_id,
  2 as lives_remaining,
  true as is_paid,
  false as is_eliminated
FROM users u;