-- Update the quran_leaderboard view to use quran_readings table
-- Run this AFTER creating the quran_readings table

-- Drop old view if exists
DROP VIEW IF EXISTS quran_leaderboard;

-- Create new leaderboard view based on quran_readings
CREATE OR REPLACE VIEW quran_leaderboard AS
SELECT
    p.id,
    p.full_name,
    p.user_group,
    p.email,
    COUNT(qr.id) AS sessions,
    COUNT(DISTINCT qr.surah_number) AS surahs_read
FROM profiles p
LEFT JOIN quran_readings qr ON qr.user_id = p.id
GROUP BY p.id, p.full_name, p.user_group, p.email
HAVING COUNT(qr.id) > 0
ORDER BY COUNT(qr.id) DESC;

-- Update community_stats view to use quran_readings
DROP VIEW IF EXISTS community_stats;

CREATE OR REPLACE VIEW community_stats AS
SELECT
    (SELECT COUNT(*) FROM profiles) AS total_members,
    (SELECT COUNT(DISTINCT user_id) FROM daily_activities WHERE activity_date = CURRENT_DATE) AS active_today,
    (SELECT COUNT(*) FROM quran_readings) AS total_sessions,
    (SELECT COUNT(*) FROM daily_activities WHERE completed = true) AS total_activities_completed;
