-- Re-enable RLS with proper policies (clean version)
-- Run this in your Supabase SQL editor

-- First, drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile during signup" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can view users in their company" ON users;

DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Owners can insert their company" ON companies;
DROP POLICY IF EXISTS "Owners can update their company" ON companies;
DROP POLICY IF EXISTS "Users can view their own company" ON companies;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Create fresh policies for users table (no recursion!)
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile during signup"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- Create fresh policies for companies table
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can insert their company"
  ON companies FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their company"
  ON companies FOR UPDATE
  USING (owner_id = auth.uid());
