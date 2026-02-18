-- =============================================
-- RAMADHAN TRACKER - ACTIVITY CATEGORIES TABLE
-- Jalankan di Supabase SQL Editor
-- =============================================
-- Tabel untuk menyimpan kategori aktivitas secara dinamis
-- Admin bisa menambah, mengubah nama, dan menghapus kategori
-- ID kategori bersifat permanen (tidak berubah saat edit)

-- Create activity_categories table
CREATE TABLE IF NOT EXISTS public.activity_categories (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '📌',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.activity_categories ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read categories
CREATE POLICY "Anyone can read categories" ON public.activity_categories
    FOR SELECT USING (true);

-- Only admins can manage categories
CREATE POLICY "Admins can manage categories" ON public.activity_categories
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

-- Insert default categories (matching existing category values in custom_activities)
INSERT INTO public.activity_categories (id, label, icon, sort_order) VALUES
    ('amanah', 'Tugas', '🎯', 1),
    ('istirahat', 'Istirahat', '😴', 2),
    ('produktifitas', 'Produktifitas', '💼', 3),
    ('sosial', 'Sosial', '🤝', 4),
    ('kesehatan', 'Kesehatan', '🏃', 5),
    ('pendidikan', 'Pendidikan', '📚', 6),
    ('lainnya', 'Lainnya', '📌', 7)
ON CONFLICT (id) DO NOTHING;
