-- Add user_group column to profiles table
-- Run this in Supabase SQL Editor

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS user_group TEXT DEFAULT NULL;

-- Add a check constraint for valid groups
ALTER TABLE profiles
ADD CONSTRAINT valid_user_group CHECK (
  user_group IS NULL OR user_group IN ('CHP', 'MR1', 'MR2', 'MR3', 'MR4', 'SMD1', 'SMD2')
);

-- Create an index for faster group queries
CREATE INDEX IF NOT EXISTS idx_profiles_user_group ON profiles(user_group);

-- Update the quran_leaderboard view to include user_group
DROP VIEW IF EXISTS quran_leaderboard;
CREATE OR REPLACE VIEW quran_leaderboard AS
SELECT
  p.id,
  p.full_name,
  p.user_group,
  COALESCE(qp.current_juz, 1) as current_juz,
  COALESCE(qp.pages_read, 0) as pages_read
FROM profiles p
LEFT JOIN quran_progress qp ON p.id = qp.user_id
ORDER BY COALESCE(qp.pages_read, 0) DESC;
