-- Add labels column to profiles table
-- This allows assigning tags (like "ANU") to users across groups

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS labels text[] DEFAULT '{}';

-- Create index for efficient label queries
CREATE INDEX IF NOT EXISTS idx_profiles_labels ON profiles USING GIN (labels);
