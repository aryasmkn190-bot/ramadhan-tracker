-- Tabel untuk menyimpan bacaan Al-Quran per-ayat
-- Setiap row = satu sesi bacaan (surat X ayat Y - ayat Z pada tanggal tertentu)
CREATE TABLE IF NOT EXISTS quran_readings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    read_date DATE NOT NULL,
    surah_number INTEGER NOT NULL CHECK (surah_number >= 1 AND surah_number <= 114),
    start_ayat INTEGER NOT NULL CHECK (start_ayat >= 1),
    end_ayat INTEGER NOT NULL CHECK (end_ayat >= 1),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Satu user tidak boleh ada duplikat sesi yang persis sama
    UNIQUE(user_id, read_date, surah_number, start_ayat, end_ayat)
);

-- Index untuk query cepat
CREATE INDEX IF NOT EXISTS idx_quran_readings_user ON quran_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_quran_readings_date ON quran_readings(user_id, read_date);

-- RLS policies
ALTER TABLE quran_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own quran_readings"
    ON quran_readings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quran_readings"
    ON quran_readings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quran_readings"
    ON quran_readings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quran_readings"
    ON quran_readings FOR DELETE
    USING (auth.uid() = user_id);
