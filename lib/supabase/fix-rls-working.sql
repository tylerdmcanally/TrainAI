-- Working RLS fix - no auth schema needed
-- Run this in your Supabase SQL editor

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Users can view company by membership" ON companies;
DROP POLICY IF EXISTS "Owners can insert their company" ON companies;
DROP POLICY IF EXISTS "Owners can update their company" ON companies;
DROP POLICY IF EXISTS "View own company" ON companies;
DROP POLICY IF EXISTS "Insert own company" ON companies;
DROP POLICY IF EXISTS "Update own company" ON companies;

DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view users in their company" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile during signup" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

DROP POLICY IF EXISTS "Users can view training modules in their company" ON training_modules;
DROP POLICY IF EXISTS "Owners can create training modules" ON training_modules;
DROP POLICY IF EXISTS "Owners can update their training modules" ON training_modules;
DROP POLICY IF EXISTS "Owners can delete their training modules" ON training_modules;
DROP POLICY IF EXISTS "View own trainings" ON training_modules;
DROP POLICY IF EXISTS "Insert own trainings" ON training_modules;
DROP POLICY IF EXISTS "Update own trainings" ON training_modules;
DROP POLICY IF EXISTS "Delete own trainings" ON training_modules;

DROP POLICY IF EXISTS "Users can view their own assignments" ON assignments;
DROP POLICY IF EXISTS "Users can view assignments for their trainings" ON assignments;
DROP POLICY IF EXISTS "Owners can create assignments" ON assignments;
DROP POLICY IF EXISTS "Employees can update their own assignments" ON assignments;
DROP POLICY IF EXISTS "View own assignments" ON assignments;
DROP POLICY IF EXISTS "View created assignments" ON assignments;
DROP POLICY IF EXISTS "Insert assignments for own trainings" ON assignments;
DROP POLICY IF EXISTS "Update own assignments" ON assignments;

DROP POLICY IF EXISTS "Users can view their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can create their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "View own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Insert own chat messages" ON chat_messages;

-- Disable and re-enable RLS to clean state
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users policies - ONLY own profile (no cross-table queries)
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "users_insert_own"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- Companies policies - owner only
CREATE POLICY "companies_select_own"
  ON companies FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "companies_insert_own"
  ON companies FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "companies_update_own"
  ON companies FOR UPDATE
  USING (owner_id = auth.uid());

-- Training modules policies - creator only
CREATE POLICY "training_select_creator"
  ON training_modules FOR SELECT
  USING (creator_id = auth.uid());

CREATE POLICY "training_insert_creator"
  ON training_modules FOR INSERT
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "training_update_creator"
  ON training_modules FOR UPDATE
  USING (creator_id = auth.uid());

CREATE POLICY "training_delete_creator"
  ON training_modules FOR DELETE
  USING (creator_id = auth.uid());

-- Assignments policies
CREATE POLICY "assignments_select_employee"
  ON assignments FOR SELECT
  USING (employee_id = auth.uid());

CREATE POLICY "assignments_select_creator"
  ON assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM training_modules 
      WHERE training_modules.id = assignments.module_id 
      AND training_modules.creator_id = auth.uid()
    )
  );

CREATE POLICY "assignments_insert_creator"
  ON assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM training_modules 
      WHERE training_modules.id = assignments.module_id 
      AND training_modules.creator_id = auth.uid()
    )
  );

CREATE POLICY "assignments_update_employee"
  ON assignments FOR UPDATE
  USING (employee_id = auth.uid());

-- Chat messages policies
CREATE POLICY "chat_select_employee"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assignments 
      WHERE assignments.id = chat_messages.assignment_id 
      AND assignments.employee_id = auth.uid()
    )
  );

CREATE POLICY "chat_insert_employee"
  ON chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assignments 
      WHERE assignments.id = chat_messages.assignment_id 
      AND assignments.employee_id = auth.uid()
    )
  );
