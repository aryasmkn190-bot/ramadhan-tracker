-- Custom Activities Table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS custom_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(10) DEFAULT '📌',
    category VARCHAR(50) NOT NULL DEFAULT 'lainnya',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE custom_activities ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read active activities
CREATE POLICY "Anyone can read active custom activities"
ON custom_activities
FOR SELECT
USING (is_active = true);

-- Policy: Only admins can insert/update/delete
CREATE POLICY "Admins can manage custom activities"
ON custom_activities
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Index for faster queries
CREATE INDEX idx_custom_activities_active ON custom_activities(is_active);
CREATE INDEX idx_custom_activities_category ON custom_activities(category);

-- Sample data (optional - run if you want test data)
-- INSERT INTO custom_activities (name, icon, category, description) VALUES
-- ('Tidur Siang', '😴', 'istirahat', 'Istirahat siang untuk menjaga stamina'),
-- ('Kerja', '💼', 'produktifitas', 'Aktivitas bekerja/kantor'),
-- ('Olahraga', '🏃', 'kesehatan', 'Aktivitas fisik untuk kesehatan'),
-- ('Belajar', '📚', 'pendidikan', 'Belajar ilmu baru'),
-- ('Silaturahmi', '🤝', 'sosial', 'Mengunjungi keluarga/teman');
