-- =============================================
-- RAMADHAN TRACKER - UPDATE: AMANAH + QURAN AYAT
-- Jalankan di Supabase SQL Editor
-- =============================================


-- ============ STEP 1: TAMBAH KOLOM NOTES ============
-- Kolom untuk menyimpan deskripsi Amanah (misal: "Kolektor", "Rekrut")

ALTER TABLE daily_activities 
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;


-- ============ STEP 2: UPDATE LEADERBOARD RPC ============
-- Perubahan:
--   1. Tambah field 'amanah' (menghitung aktivitas custom berkategori amanah)
--   2. Ganti 'quran_sessions' menjadi 'quran_ayat' (hitung total ayat, bukan sesi)

-- DROP dulu karena return type berubah (PostgreSQL tidak izinkan ALTER return type)
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
        -- Sholat Wajib
        COALESCE(SUM(CASE WHEN da.activity_id IN ('subuh','dzuhur','ashar','maghrib','isya') AND da.completed THEN 1 ELSE 0 END), 0) AS sholat,
        -- Sholat Sunnah
        COALESCE(SUM(CASE WHEN da.activity_id IN ('tahajud','dhuha','tarawih','witir') AND da.completed THEN 1 ELSE 0 END), 0) AS sunnah,
        -- Aktivitas Ramadhan
        COALESCE(SUM(CASE WHEN da.activity_id IN ('sahur','puasa','buka','dzikir','sedekah','tadarus') AND da.completed THEN 1 ELSE 0 END), 0) AS aktivitas,
        -- Custom (non-amanah, non-default)
        COALESCE(SUM(CASE 
            WHEN da.activity_id NOT IN ('subuh','dzuhur','ashar','maghrib','isya','tahajud','dhuha','tarawih','witir','sahur','puasa','buka','dzikir','sedekah','tadarus') 
                AND NOT (da.activity_id = ANY(amanah_ids))
                AND da.completed THEN 1 ELSE 0 
        END), 0) AS custom,
        -- Amanah
        COALESCE(SUM(CASE 
            WHEN da.activity_id = ANY(amanah_ids) AND da.completed THEN 1 ELSE 0 
        END), 0) AS amanah,
        -- Total
        COALESCE(SUM(CASE WHEN da.completed THEN 1 ELSE 0 END), 0) AS total,
        -- Quran Sessions (backward compatibility)
        COALESCE(qr_stats.session_count, 0) AS quran_sessions,
        -- Quran Ayat (jumlah ayat yang dibaca)
        COALESCE(qr_stats.ayat_total, 0) AS quran_ayat
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


-- ============ STEP 3: UPDATE GROUP RANKING RPC ============
-- Perubahan: Ganti hitung sesi menjadi hitung ayat

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
        COALESCE(qr_agg.total_ayat, 0) AS total_quran_sessions,
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
