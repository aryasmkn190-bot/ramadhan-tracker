-- ===========================================
-- RAMADHAN TRACKER - DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ===========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- 1. PROFILES TABLE (User Data)
-- ===========================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ===========================================
-- 2. DAILY ACTIVITIES TABLE
-- ===========================================
CREATE TABLE daily_activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  activity_date DATE NOT NULL,
  activity_id TEXT NOT NULL,
  activity_name TEXT NOT NULL,
  activity_category TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, activity_date, activity_id)
);

-- Enable Row Level Security
ALTER TABLE daily_activities ENABLE ROW LEVEL SECURITY;

-- Policies for daily_activities
CREATE POLICY "Users can view own activities"
  ON daily_activities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activities"
  ON daily_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activities"
  ON daily_activities FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activities"
  ON daily_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ===========================================
-- 3. QURAN PROGRESS TABLE
-- ===========================================
CREATE TABLE quran_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  current_juz INTEGER DEFAULT 1 CHECK (current_juz BETWEEN 1 AND 30),
  pages_read INTEGER DEFAULT 0,
  last_read_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE quran_progress ENABLE ROW LEVEL SECURITY;

-- Policies for quran_progress
CREATE POLICY "Users can view all quran progress (for leaderboard)"
  ON quran_progress FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own quran progress"
  ON quran_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quran progress"
  ON quran_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- ===========================================
-- 4. QURAN READING LOG TABLE (Daily Tracking)
-- ===========================================
CREATE TABLE quran_reading_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  read_date DATE NOT NULL,
  pages_count INTEGER NOT NULL CHECK (pages_count > 0),
  juz_number INTEGER CHECK (juz_number BETWEEN 1 AND 30),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, read_date)
);

-- Enable Row Level Security
ALTER TABLE quran_reading_log ENABLE ROW LEVEL SECURITY;

-- Policies for quran_reading_log
CREATE POLICY "Users can view all reading logs"
  ON quran_reading_log FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own reading logs"
  ON quran_reading_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reading logs"
  ON quran_reading_log FOR UPDATE
  USING (auth.uid() = user_id);

-- ===========================================
-- 5. ANNOUNCEMENTS TABLE (Admin Only)
-- ===========================================
CREATE TABLE announcements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Policies for announcements
CREATE POLICY "Everyone can view active announcements"
  ON announcements FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can insert announcements"
  ON announcements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update announcements"
  ON announcements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ===========================================
-- 6. FUNCTIONS & TRIGGERS
-- ===========================================

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Also create initial quran_progress record
  INSERT INTO public.quran_progress (user_id, current_juz, pages_read)
  VALUES (NEW.id, 1, 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quran_progress_updated_at
  BEFORE UPDATE ON quran_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 7. VIEWS FOR LEADERBOARD
-- ===========================================

-- Quran Leaderboard View
CREATE OR REPLACE VIEW quran_leaderboard AS
SELECT 
  p.id,
  p.full_name,
  p.avatar_url,
  q.current_juz,
  q.pages_read,
  q.last_read_date,
  RANK() OVER (ORDER BY q.pages_read DESC) as rank
FROM profiles p
LEFT JOIN quran_progress q ON p.id = q.user_id
WHERE q.pages_read > 0
ORDER BY q.pages_read DESC;

-- Activity Leaderboard View (Most completed activities)
CREATE OR REPLACE VIEW activity_leaderboard AS
SELECT 
  p.id,
  p.full_name,
  p.avatar_url,
  COUNT(da.id) FILTER (WHERE da.completed = true) as total_completed,
  RANK() OVER (ORDER BY COUNT(da.id) FILTER (WHERE da.completed = true) DESC) as rank
FROM profiles p
LEFT JOIN daily_activities da ON p.id = da.user_id
GROUP BY p.id, p.full_name, p.avatar_url
HAVING COUNT(da.id) FILTER (WHERE da.completed = true) > 0
ORDER BY total_completed DESC;

-- Community Stats View
CREATE OR REPLACE VIEW community_stats AS
SELECT 
  (SELECT COUNT(*) FROM profiles) as total_members,
  (SELECT SUM(pages_read) FROM quran_progress) as total_pages_read,
  (SELECT COUNT(*) FROM daily_activities WHERE completed = true) as total_activities_completed,
  (SELECT COUNT(DISTINCT user_id) FROM daily_activities WHERE activity_date = CURRENT_DATE AND completed = true) as active_today;

-- ===========================================
-- 8. INDEXES FOR PERFORMANCE
-- ===========================================
CREATE INDEX idx_daily_activities_user_date ON daily_activities(user_id, activity_date);
CREATE INDEX idx_daily_activities_date ON daily_activities(activity_date);
CREATE INDEX idx_quran_progress_pages ON quran_progress(pages_read DESC);
CREATE INDEX idx_quran_reading_log_user_date ON quran_reading_log(user_id, read_date);

-- ===========================================
-- 9. SAMPLE ADMIN USER (Update with your email)
-- ===========================================
-- After creating your first account, run this to make yourself admin:
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
