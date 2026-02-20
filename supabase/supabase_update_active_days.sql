-- =============================================
-- RAMADHAN TRACKER - UPDATE: IDLE HOURS LEADERBOARD
-- Jalankan di Supabase SQL Editor
-- =============================================
-- Menambahkan field 'idle_hours' ke get_leaderboard RPC
-- idle_hours = total jam tanpa aktivitas (sama seperti "Tidak Ada Aktivitas" di clock chart)
-- Dihitung dari gap waktu antar aktivitas dalam 24 jam, dijumlahkan per hari

-- DROP dulu karena return type berubah
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
    quran_ayat BIGINT,
    idle_hours NUMERIC
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
        COALESCE(qr_stats.ayat_total, 0) AS quran_ayat,
        -- Idle Hours (dihitung client-side, ini hanya placeholder)
        -- Perhitungan idle hours yang akurat membutuhkan parsing start_time/end_time
        -- yang lebih baik dilakukan di client-side (sudah diimplementasikan)
        0::NUMERIC AS idle_hours
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
