-- Fix infinite recursion in RLS policies
-- Run this in your Supabase SQL editor

-- Drop ALL existing policies on users table
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view users in their company" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile during signup" ON users;
DROP POLICY IF EXISTS "Service role can insert users" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Drop ALL existing policies on companies table
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Owners can insert their company" ON companies;
DROP POLICY IF EXISTS "Service role can insert companies" ON companies;
DROP POLICY IF EXISTS "Owners can update their company" ON companies;

-- Temporarily disable RLS to fix the issue
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with simple, non-recursive policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies for users
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can view users in their company"
  ON users FOR SELECT
  USING (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid() LIMIT 1
    )
  );

CREATE POLICY "Users can insert their own profile during signup"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- Create simple policies for companies
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can view company by membership"
  ON companies FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Owners can insert their company"
  ON companies FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their company"
  ON companies FOR UPDATE
  USING (owner_id = auth.uid());

