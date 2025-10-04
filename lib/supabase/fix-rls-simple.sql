-- Simplest RLS fix - no recursion possible
-- Run this in your Supabase SQL editor

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Users can view company by membership" ON companies;
DROP POLICY IF EXISTS "Owners can insert their company" ON companies;
DROP POLICY IF EXISTS "Owners can update their company" ON companies;

DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view users in their company" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile during signup" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

DROP POLICY IF EXISTS "Users can view training modules in their company" ON training_modules;
DROP POLICY IF EXISTS "Owners can create training modules" ON training_modules;
DROP POLICY IF EXISTS "Owners can update their training modules" ON training_modules;
DROP POLICY IF EXISTS "Owners can delete their training modules" ON training_modules;

DROP POLICY IF EXISTS "Users can view assignments for their trainings" ON assignments;
DROP POLICY IF EXISTS "Users can view their own assignments" ON assignments;
DROP POLICY IF EXISTS "Owners can create assignments" ON assignments;
DROP POLICY IF EXISTS "Employees can update their own assignments" ON assignments;

DROP POLICY IF EXISTS "Users can view their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can create their own chat messages" ON chat_messages;

-- Disable RLS temporarily to ensure no issues
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create ONLY the absolutely necessary policies with NO recursion

-- Users: Only allow viewing own profile (no company-wide access for now)
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- Companies: Simple owner-only access
CREATE POLICY "View own company"
  ON companies FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Insert own company"
  ON companies FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Update own company"
  ON companies FOR UPDATE
  USING (owner_id = auth.uid());

-- Training modules: Creator-only access
CREATE POLICY "View own trainings"
  ON training_modules FOR SELECT
  USING (creator_id = auth.uid());

CREATE POLICY "Insert own trainings"
  ON training_modules FOR INSERT
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Update own trainings"
  ON training_modules FOR UPDATE
  USING (creator_id = auth.uid());

CREATE POLICY "Delete own trainings"
  ON training_modules FOR DELETE
  USING (creator_id = auth.uid());

-- Assignments: Employee access + creator access
CREATE POLICY "View own assignments"
  ON assignments FOR SELECT
  USING (employee_id = auth.uid());

CREATE POLICY "View created assignments"
  ON assignments FOR SELECT
  USING (
    module_id IN (SELECT id FROM training_modules WHERE creator_id = auth.uid())
  );

CREATE POLICY "Insert assignments for own trainings"
  ON assignments FOR INSERT
  WITH CHECK (
    module_id IN (SELECT id FROM training_modules WHERE creator_id = auth.uid())
  );

CREATE POLICY "Update own assignments"
  ON assignments FOR UPDATE
  USING (employee_id = auth.uid());

-- Chat messages: Simple employee access
CREATE POLICY "View own chat messages"
  ON chat_messages FOR SELECT
  USING (
    assignment_id IN (SELECT id FROM assignments WHERE employee_id = auth.uid())
  );

CREATE POLICY "Insert own chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    assignment_id IN (SELECT id FROM assignments WHERE employee_id = auth.uid())
  );
