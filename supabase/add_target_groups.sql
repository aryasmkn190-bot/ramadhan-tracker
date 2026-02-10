-- Add target_groups column to custom_activities table
-- Run this in Supabase SQL Editor
-- NULL means activity is visible to ALL groups
-- Array of group names means activity is only visible to those groups

ALTER TABLE custom_activities
ADD COLUMN IF NOT EXISTS target_groups TEXT[] DEFAULT NULL;

-- Index for faster group-based queries
CREATE INDEX IF NOT EXISTS idx_custom_activities_target_groups ON custom_activities USING GIN (target_groups);
