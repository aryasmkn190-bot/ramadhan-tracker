-- =============================================
-- RAMADHAN TRACKER - FIX SESSION COUNT
-- Memperbaiki penghitungan aktivitas multi-session
-- di RPC get_leaderboard dan get_dashboard_stats
-- 
-- Masalah: Aktivitas multi-session (misal tidur 3x)
-- disimpan dalam 1 row database tapi seharusnya dihitung
-- sebagai 3 aktivitas (sesuai jumlah sesi).
--
-- Jalankan di Supabase SQL Editor
-- =============================================


-- ============ STEP 1: HELPER FUNCTION ============
-- Fungsi untuk menghitung jumlah sesi dari 1 row aktivitas
-- Jika end_time = '__multi__', parse JSON array di start_time
-- dan hitung jumlah elemen (jumlah sesi). Selain itu, return 1.

CREATE OR REPLACE FUNCTION count_sessions(
    p_start_time TEXT,
    p_end_time TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF p_end_time = '__multi__' AND p_start_time IS NOT NULL THEN
        BEGIN
            RETURN jsonb_array_length(p_start_time::jsonb);
        EXCEPTION WHEN OTHERS THEN
            RETURN 1;
        END;
    END IF;
    RETURN 1;
END;
$$;


-- ============ STEP 2: UPDATE get_leaderboard ============
-- Ganti COUNT 1-per-row menjadi SUM count_sessions()

DROP FUNCTION IF EXISTS get_leaderboard(TEXT, TEXT, TEXT);

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
    amanah BIGINT,
    total BIGINT,
    quran_sessions BIGINT,
    quran_ayat BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    amanah_ids TEXT[];
BEGIN
    -- Ambil daftar ID aktivitas amanah dari custom_activities
    SELECT ARRAY_AGG('custom_' || ca.id::TEXT)
    INTO amanah_ids
    FROM custom_activities ca
    WHERE ca.category = 'amanah' AND ca.is_active = true;

    -- Default ke array kosong jika NULL
    IF amanah_ids IS NULL THEN
        amanah_ids := ARRAY[]::TEXT[];
    END IF;

    RETURN QUERY
    SELECT 
        p.id AS user_id,
        p.full_name,
        p.user_group,
        p.email,
        p.role,
        -- Sholat Wajib (session-aware)
        COALESCE(SUM(CASE WHEN da.activity_id IN ('subuh','dzuhur','ashar','maghrib','isya') AND da.completed 
            THEN count_sessions(da.start_time, da.end_time) ELSE 0 END), 0)::BIGINT AS sholat,
        -- Sholat Sunnah (session-aware)
        COALESCE(SUM(CASE WHEN da.activity_id IN ('tahajud','dhuha','tarawih','witir') AND da.completed 
            THEN count_sessions(da.start_time, da.end_time) ELSE 0 END), 0)::BIGINT AS sunnah,
        -- Aktivitas Ramadhan (session-aware)
        COALESCE(SUM(CASE WHEN da.activity_id IN ('sahur','puasa','buka','dzikir','sedekah','tadarus') AND da.completed 
            THEN count_sessions(da.start_time, da.end_time) ELSE 0 END), 0)::BIGINT AS aktivitas,
        -- Custom non-amanah (session-aware)
        COALESCE(SUM(CASE 
            WHEN da.activity_id NOT IN ('subuh','dzuhur','ashar','maghrib','isya','tahajud','dhuha','tarawih','witir','sahur','puasa','buka','dzikir','sedekah','tadarus') 
                AND NOT (da.activity_id = ANY(amanah_ids))
                AND da.completed 
            THEN count_sessions(da.start_time, da.end_time) ELSE 0 
        END), 0)::BIGINT AS custom,
        -- Amanah (session-aware)
        COALESCE(SUM(CASE 
            WHEN da.activity_id = ANY(amanah_ids) AND da.completed 
            THEN count_sessions(da.start_time, da.end_time) ELSE 0 
        END), 0)::BIGINT AS amanah,
        -- Total (session-aware)
        COALESCE(SUM(CASE WHEN da.completed 
            THEN count_sessions(da.start_time, da.end_time) ELSE 0 END), 0)::BIGINT AS total,
        -- Quran Sessions (backward compatibility)
        COALESCE(qr_stats.session_count, 0)::BIGINT AS quran_sessions,
        -- Quran Ayat
        COALESCE(qr_stats.ayat_total, 0)::BIGINT AS quran_ayat
    FROM profiles p
    LEFT JOIN daily_activities da 
        ON da.user_id = p.id
        AND (date_from IS NULL OR da.activity_date >= date_from)
        AND (date_to IS NULL OR da.activity_date <= date_to)
    LEFT JOIN (
        SELECT 
            qr.user_id, 
            COUNT(*) AS session_count,
            SUM(
                CASE 
                    WHEN qr.end_ayat IS NOT NULL AND qr.start_ayat IS NOT NULL 
                    THEN GREATEST(qr.end_ayat - qr.start_ayat + 1, 1)
                    ELSE 1
                END
            ) AS ayat_total
        FROM quran_readings qr
        WHERE (date_from IS NULL OR qr.read_date >= date_from)
          AND (date_to IS NULL OR qr.read_date <= date_to)
        GROUP BY qr.user_id
    ) qr_stats ON qr_stats.user_id = p.id
    WHERE (group_filter IS NULL OR p.user_group = group_filter)
    GROUP BY p.id, p.full_name, p.user_group, p.email, p.role, qr_stats.session_count, qr_stats.ayat_total
    ORDER BY total DESC;
END;
$$;


-- ============ STEP 3: UPDATE get_dashboard_stats ============
-- Ganti COUNT(*) menjadi SUM(count_sessions())

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
        'totalActivities', (
            SELECT COALESCE(SUM(count_sessions(start_time, end_time)), 0) 
            FROM daily_activities 
            WHERE completed = true
        ),
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


-- ============ STEP 4: UPDATE get_group_ranking ============
-- Ganti COUNT menjadi SUM(count_sessions()) untuk konsistensi

DROP FUNCTION IF EXISTS get_group_ranking(TEXT, TEXT);

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
        COALESCE(SUM(CASE WHEN da.completed 
            THEN count_sessions(da.start_time, da.end_time) ELSE 0 END), 0)::BIGINT AS total_activities,
        COALESCE(qr_agg.total_ayat, 0)::BIGINT AS total_quran_sessions,
        CASE 
            WHEN COUNT(DISTINCT p.id) > 0 
            THEN (COALESCE(SUM(CASE WHEN da.completed 
                THEN count_sessions(da.start_time, da.end_time) ELSE 0 END), 0) / COUNT(DISTINCT p.id))::BIGINT
            ELSE 0::BIGINT
        END AS avg_activities
    FROM profiles p
    LEFT JOIN daily_activities da 
        ON da.user_id = p.id
        AND (date_from IS NULL OR da.activity_date >= date_from)
        AND (date_to IS NULL OR da.activity_date <= date_to)
    LEFT JOIN (
        SELECT 
            pr.user_group, 
            SUM(
                CASE 
                    WHEN qr2.end_ayat IS NOT NULL AND qr2.start_ayat IS NOT NULL 
                    THEN GREATEST(qr2.end_ayat - qr2.start_ayat + 1, 1)
                    ELSE 1
                END
            ) AS total_ayat
        FROM quran_readings qr2
        JOIN profiles pr ON pr.id = qr2.user_id
        WHERE (date_from IS NULL OR qr2.read_date >= date_from)
          AND (date_to IS NULL OR qr2.read_date <= date_to)
        GROUP BY pr.user_group
    ) qr_agg ON qr_agg.user_group = p.user_group
    WHERE p.user_group IS NOT NULL
    GROUP BY p.user_group, qr_agg.total_ayat
    ORDER BY total_activities DESC;
END;
$$;
