-- =============================================
-- MENAMBAHKAN KOLOM NOTES DI TABEL DAILY_ACTIVITIES
-- Jalankan di Supabase SQL Editor
-- =============================================

-- Tambahkan kolom notes untuk deskripsi aktivitas (khususnya Amanah)
ALTER TABLE daily_activities 
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;
