-- Re-enable RLS with proper policies
-- Run this in your Supabase SQL editor

-- Re-enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Re-enable RLS on companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Add proper policies for users table (no recursion!)
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile during signup"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- Add proper policies for companies table
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can insert their company"
  ON companies FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their company"
  ON companies FOR UPDATE
  USING (owner_id = auth.uid());

-- Note: We're keeping it simple - users can only see their own profile
-- We'll add team viewing later when we build the team management feature
