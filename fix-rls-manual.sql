-- TrainAI RLS Fix - Copy and paste this into your Supabase SQL Editor
-- This will disable RLS temporarily to get your app working

-- Step 1: Disable RLS on all tables
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop any existing corrupted policies (optional)
DROP POLICY IF EXISTS "users_select_self" ON users;
DROP POLICY IF EXISTS "users_select_company" ON users;
DROP POLICY IF EXISTS "users_insert_self" ON users;
DROP POLICY IF EXISTS "users_update_self" ON users;
DROP POLICY IF EXISTS "company_select_own" ON companies;
DROP POLICY IF EXISTS "company_select_member" ON companies;
DROP POLICY IF EXISTS "company_insert_owner" ON companies;
DROP POLICY IF EXISTS "company_update_owner" ON companies;
DROP POLICY IF EXISTS "training_select_company" ON training_modules;
DROP POLICY IF EXISTS "training_insert_owner" ON training_modules;
DROP POLICY IF EXISTS "training_update_creator" ON training_modules;
DROP POLICY IF EXISTS "training_delete_creator" ON training_modules;
DROP POLICY IF EXISTS "assignment_select_employee" ON assignments;
DROP POLICY IF EXISTS "assignment_select_owner" ON assignments;
DROP POLICY IF EXISTS "assignment_insert_owner" ON assignments;
DROP POLICY IF EXISTS "assignment_update_employee" ON assignments;
DROP POLICY IF EXISTS "assignment_update_owner" ON assignments;
DROP POLICY IF EXISTS "chat_select_own" ON chat_messages;
DROP POLICY IF EXISTS "chat_insert_own" ON chat_messages;

-- Step 3: Test that queries work (optional - you can run this to verify)
-- SELECT COUNT(*) FROM companies;
-- SELECT COUNT(*) FROM users;
-- SELECT COUNT(*) FROM training_modules;

-- Your app should now work! 
-- Later, you can re-enable RLS with simple policies if needed.
