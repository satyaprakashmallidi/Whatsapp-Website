-- TEMPORARY: Disable RLS for testing
-- WARNING: This allows ALL authenticated users to access ALL data
-- Only use this for testing, then re-enable RLS with proper policies

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own data" ON "User_details";
DROP POLICY IF EXISTS "Users can insert their own data" ON "User_details";
DROP POLICY IF EXISTS "Users can update their own data" ON "User_details";
DROP POLICY IF EXISTS "Users can delete their own data" ON "User_details";

-- Disable RLS
ALTER TABLE "User_details" DISABLE ROW LEVEL SECURITY;

-- OR keep RLS enabled but allow all authenticated users (safer option)
-- ALTER TABLE "User_details" ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Allow all for authenticated users"
--   ON "User_details"
--   FOR ALL
--   USING (auth.role() = 'authenticated')
--   WITH CHECK (auth.role() = 'authenticated');
