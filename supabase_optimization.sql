-- =============================================
-- RAMADHAN TRACKER - DATABASE OPTIMIZATION
-- Jalankan di Supabase SQL Editor satu per satu
-- =============================================

-- ============ STEP 1: INDEXES ============

-- Index untuk query aktivitas per user dan tanggal
CREATE INDEX IF NOT EXISTS idx_daily_activities_user_date 
ON daily_activities(user_id, activity_date);

-- Index untuk filter aktivitas yang sudah selesai
CREATE INDEX IF NOT EXISTS idx_daily_activities_completed 
ON daily_activities(completed) WHERE completed = true;

-- Index untuk query aktivitas berdasarkan activity_id (kategori sholat dll)
CREATE INDEX IF NOT EXISTS idx_daily_activities_activity_id 
ON daily_activities(activity_id);

-- Index komposit untuk leaderboard query
CREATE INDEX IF NOT EXISTS idx_daily_activities_user_date_completed 
ON daily_activities(user_id, activity_date, completed);

-- Index untuk quran readings per user dan tanggal
CREATE INDEX IF NOT EXISTS idx_quran_readings_user_date 
ON quran_readings(user_id, read_date);

-- Index untuk profiles berdasarkan grup
CREATE INDEX IF NOT EXISTS idx_profiles_user_group 
ON profiles(user_group);

-- Index untuk profiles berdasarkan role
CREATE INDEX IF NOT EXISTS idx_profiles_role 
ON profiles(role);


-- ============ STEP 2: LEADERBOARD RPC FUNCTION ============
-- Fungsi ini menghitung leaderboard di sisi database (jauh lebih cepat)

CREATE OR REPLACE FUNCTION get_leaderboard(
    date_from TEXT DEFAULT NULL,
    date_to TEXT DEFAULT NULL,
    group_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    user_group TEXT,
    email TEXT,
    role TEXT,
    sholat BIGINT,
    sunnah BIGINT,
    aktivitas BIGINT,
    custom BIGINT,
    total BIGINT,
    quran_sessions BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id AS user_id,
        p.full_name,
        p.user_group,
        p.email,
        p.role,
        COALESCE(SUM(CASE WHEN da.activity_id IN ('subuh','dzuhur','ashar','maghrib','isya') AND da.completed THEN 1 ELSE 0 END), 0) AS sholat,
        COALESCE(SUM(CASE WHEN da.activity_id IN ('tahajud','dhuha','tarawih','witir') AND da.completed THEN 1 ELSE 0 END), 0) AS sunnah,
        COALESCE(SUM(CASE WHEN da.activity_id IN ('sahur','puasa','buka','dzikir','sedekah','tadarus') AND da.completed THEN 1 ELSE 0 END), 0) AS aktivitas,
        COALESCE(SUM(CASE WHEN da.activity_id NOT IN ('subuh','dzuhur','ashar','maghrib','isya','tahajud','dhuha','tarawih','witir','sahur','puasa','buka','dzikir','sedekah','tadarus') AND da.completed THEN 1 ELSE 0 END), 0) AS custom,
        COALESCE(SUM(CASE WHEN da.completed THEN 1 ELSE 0 END), 0) AS total,
        COALESCE(qr_count.cnt, 0) AS quran_sessions
    FROM profiles p
    LEFT JOIN daily_activities da 
        ON da.user_id = p.id
        AND (date_from IS NULL OR da.activity_date >= date_from)
        AND (date_to IS NULL OR da.activity_date <= date_to)
    LEFT JOIN (
        SELECT qr.user_id, COUNT(*) AS cnt
        FROM quran_readings qr
        WHERE (date_from IS NULL OR qr.read_date >= date_from)
          AND (date_to IS NULL OR qr.read_date <= date_to)
        GROUP BY qr.user_id
    ) qr_count ON qr_count.user_id = p.id
    WHERE (group_filter IS NULL OR p.user_group = group_filter)
    GROUP BY p.id, p.full_name, p.user_group, p.email, p.role, qr_count.cnt
    ORDER BY total DESC;
END;
$$;


-- ============ STEP 3: GROUP RANKING RPC FUNCTION ============
-- Fungsi untuk mendapatkan peringkat grup

CREATE OR REPLACE FUNCTION get_group_ranking(
    date_from TEXT DEFAULT NULL,
    date_to TEXT DEFAULT NULL
)
RETURNS TABLE (
    group_name TEXT,
    member_count BIGINT,
    total_activities BIGINT,
    total_quran_sessions BIGINT,
    avg_activities BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.user_group AS group_name,
        COUNT(DISTINCT p.id) AS member_count,
        COALESCE(SUM(CASE WHEN da.completed THEN 1 ELSE 0 END), 0) AS total_activities,
        COALESCE(qr_agg.total_sessions, 0) AS total_quran_sessions,
        CASE 
            WHEN COUNT(DISTINCT p.id) > 0 
            THEN COALESCE(SUM(CASE WHEN da.completed THEN 1 ELSE 0 END), 0) / COUNT(DISTINCT p.id)
            ELSE 0 
        END AS avg_activities
    FROM profiles p
    LEFT JOIN daily_activities da 
        ON da.user_id = p.id
        AND (date_from IS NULL OR da.activity_date >= date_from)
        AND (date_to IS NULL OR da.activity_date <= date_to)
    LEFT JOIN (
        SELECT pr.user_group, COUNT(*) AS total_sessions
        FROM quran_readings qr2
        JOIN profiles pr ON pr.id = qr2.user_id
        WHERE (date_from IS NULL OR qr2.read_date >= date_from)
          AND (date_to IS NULL OR qr2.read_date <= date_to)
        GROUP BY pr.user_group
    ) qr_agg ON qr_agg.user_group = p.user_group
    WHERE p.user_group IS NOT NULL
    GROUP BY p.user_group, qr_agg.total_sessions
    ORDER BY total_activities DESC;
END;
$$;


-- ============ STEP 4: DASHBOARD STATS RPC FUNCTION ============

CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'totalMembers', (SELECT COUNT(*) FROM profiles),
        'admins', (SELECT COUNT(*) FROM profiles WHERE role = 'admin'),
        'groupAdmins', (SELECT COUNT(*) FROM profiles WHERE role = 'group_admin'),
        'newThisWeek', (SELECT COUNT(*) FROM profiles WHERE created_at > NOW() - INTERVAL '7 days'),
        'totalActivities', (SELECT COUNT(*) FROM daily_activities WHERE completed = true),
        'totalQuranReadings', (SELECT COUNT(*) FROM quran_readings),
        'groupCounts', (
            SELECT json_object_agg(user_group, cnt)
            FROM (
                SELECT user_group, COUNT(*) AS cnt
                FROM profiles
                WHERE user_group IS NOT NULL
                GROUP BY user_group
            ) sub
        )
    ) INTO result;
    
    RETURN result;
END;
$$;
