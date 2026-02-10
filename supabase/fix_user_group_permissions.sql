-- ===========================================
-- FIX: User Group Not Saving
-- Run this in Supabase SQL Editor
-- ===========================================

-- FIX 1: Allow admins to update ANY profile (for group assignment, role changes)
-- Currently only users can update their own profile, admin edits are silently rejected by RLS
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- FIX 2: Allow admins to insert profiles (for import functionality)
CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- FIX 3: Allow admins to delete profiles
CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- FIX 4: Update the handle_new_user trigger to include user_group from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, user_group)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'user_group'
  );
  
  -- Also create initial quran_progress record
  INSERT INTO public.quran_progress (user_id, current_juz, pages_read)
  VALUES (NEW.id, 1, 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FIX 5: Allow admins to view all activities (for admin dashboard)
-- Check if the policy already exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'daily_activities' 
    AND policyname = 'Admins can view all activities'
  ) THEN
    CREATE POLICY "Admins can view all activities"
      ON daily_activities FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- FIX 6: Allow admins to delete activities (for member deletion)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'daily_activities' 
    AND policyname = 'Admins can delete activities'
  ) THEN
    CREATE POLICY "Admins can delete activities"
      ON daily_activities FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- FIX 7: Allow admins to delete quran_progress (for member deletion)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'quran_progress' 
    AND policyname = 'Admins can delete quran progress'
  ) THEN
    CREATE POLICY "Admins can delete quran progress"
      ON quran_progress FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- FIX 8: Allow admins to delete quran_reading_log (for member deletion)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'quran_reading_log' 
    AND policyname = 'Admins can delete reading logs'
  ) THEN
    CREATE POLICY "Admins can delete reading logs"
      ON quran_reading_log FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;
