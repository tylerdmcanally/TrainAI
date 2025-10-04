-- Final fix for RLS - eliminate ALL circular references
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

DROP POLICY IF EXISTS "Users can view their own assignments" ON assignments;
DROP POLICY IF EXISTS "Users can view assignments for their trainings" ON assignments;
DROP POLICY IF EXISTS "Owners can create assignments" ON assignments;
DROP POLICY IF EXISTS "Employees can update their own assignments" ON assignments;

DROP POLICY IF EXISTS "Users can view their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can create their own chat messages" ON chat_messages;

-- Re-enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create a helper function to get user's company_id safely
CREATE OR REPLACE FUNCTION auth.user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Companies policies (simple, no subqueries)
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can view company by membership"
  ON companies FOR SELECT
  USING (id = auth.user_company_id());

CREATE POLICY "Owners can insert their company"
  ON companies FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their company"
  ON companies FOR UPDATE
  USING (owner_id = auth.uid());

-- Users policies (NO self-referencing queries)
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can view users in their company"
  ON users FOR SELECT
  USING (company_id = auth.user_company_id());

CREATE POLICY "Users can insert their own profile during signup"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- Training modules policies
CREATE POLICY "Users can view training modules in their company"
  ON training_modules FOR SELECT
  USING (company_id = auth.user_company_id());

CREATE POLICY "Owners can create training modules"
  ON training_modules FOR INSERT
  WITH CHECK (
    creator_id = auth.uid() AND
    company_id = auth.user_company_id()
  );

CREATE POLICY "Owners can update their training modules"
  ON training_modules FOR UPDATE
  USING (
    creator_id = auth.uid() AND
    company_id = auth.user_company_id()
  );

CREATE POLICY "Owners can delete their training modules"
  ON training_modules FOR DELETE
  USING (
    creator_id = auth.uid() AND
    company_id = auth.user_company_id()
  );

-- Assignments policies
CREATE POLICY "Users can view their own assignments"
  ON assignments FOR SELECT
  USING (employee_id = auth.uid());

CREATE POLICY "Users can view assignments for their trainings"
  ON assignments FOR SELECT
  USING (
    module_id IN (
      SELECT id FROM training_modules 
      WHERE creator_id = auth.uid()
    )
  );

CREATE POLICY "Owners can create assignments"
  ON assignments FOR INSERT
  WITH CHECK (
    module_id IN (
      SELECT id FROM training_modules 
      WHERE creator_id = auth.uid()
    )
  );

CREATE POLICY "Employees can update their own assignments"
  ON assignments FOR UPDATE
  USING (employee_id = auth.uid());

-- Chat messages policies
CREATE POLICY "Users can view their own chat messages"
  ON chat_messages FOR SELECT
  USING (
    assignment_id IN (
      SELECT id FROM assignments WHERE employee_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    assignment_id IN (
      SELECT id FROM assignments WHERE employee_id = auth.uid()
    )
  );
