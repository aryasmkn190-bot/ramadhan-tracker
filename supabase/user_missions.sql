-- =====================================================
-- MISI RAMADHAN - User Missions Table
-- =====================================================

-- Create user_missions table
CREATE TABLE IF NOT EXISTS user_missions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mission_id text NOT NULL,
  completed boolean DEFAULT false,
  completion_date date,
  data jsonb DEFAULT '{}',
  file_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_missions_user_id ON user_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_mission_id ON user_missions(mission_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_user_mission ON user_missions(user_id, mission_id);

-- Enable Row Level Security
ALTER TABLE user_missions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can manage their own missions
CREATE POLICY "Users can view own missions"
  ON user_missions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own missions"
  ON user_missions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own missions"
  ON user_missions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own missions"
  ON user_missions FOR DELETE
  USING (auth.uid() = user_id);

-- Admin can view all missions (for reporting)
CREATE POLICY "Admin can view all missions"
  ON user_missions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- Storage Bucket for Mission Files (photos, documents)
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('missions', 'missions', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Users upload to their own folder
CREATE POLICY "Users can upload mission files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'missions' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view mission files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'missions');

CREATE POLICY "Users can update own mission files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'missions' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own mission files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'missions' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
