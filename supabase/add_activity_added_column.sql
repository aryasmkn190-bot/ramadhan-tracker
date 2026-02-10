-- Add 'added' column to daily_activities table
-- This tracks whether a custom activity has been explicitly added to a day by the user
ALTER TABLE daily_activities ADD COLUMN IF NOT EXISTS added BOOLEAN DEFAULT false;

-- Note: After running this, custom activities that were previously tracked
-- will need their 'added' flag set to true. Run the following to fix existing data:
UPDATE daily_activities SET added = true WHERE activity_id LIKE 'custom_%';
