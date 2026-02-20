-- ============================================================
-- FIX: Allow group_admin to read daily_activities of their group members
-- ============================================================
-- Problem: RLS on daily_activities only allows:
--   1. Users to read their OWN activities (auth.uid() = user_id)
--   2. Full admins (role = 'admin') to read ALL activities
-- Group admins (role = 'group_admin') cannot read their group members' activities.
--
-- Note: managed_groups is JSONB (e.g. ["PTO HOLDING 1", "PTO HOLDING 3"])
-- ============================================================

-- Step 1: Add policy for group_admin to read daily_activities
CREATE POLICY "Group admins can view group member activities"
  ON daily_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      JOIN profiles member_profile ON member_profile.id = daily_activities.user_id
      WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'group_admin'
        AND admin_profile.managed_groups IS NOT NULL
        AND admin_profile.managed_groups @> to_jsonb(member_profile.user_group)
    )
  );

-- Step 2: Also ensure quran_readings has equivalent policy (if RLS is enabled)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'quran_readings' AND rowsecurity = true
  ) THEN
    DROP POLICY IF EXISTS "Group admins can view group member quran readings" ON quran_readings;
    
    CREATE POLICY "Group admins can view group member quran readings"
      ON quran_readings FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles admin_profile
          JOIN profiles member_profile ON member_profile.id = quran_readings.user_id
          WHERE admin_profile.id = auth.uid()
            AND admin_profile.role = 'group_admin'
            AND admin_profile.managed_groups IS NOT NULL
            AND admin_profile.managed_groups @> to_jsonb(member_profile.user_group)
        )
      );
    
    RAISE NOTICE 'Added group admin RLS policy for quran_readings';
  ELSE
    RAISE NOTICE 'quran_readings does not have RLS enabled, skipping';
  END IF;
END $$;
