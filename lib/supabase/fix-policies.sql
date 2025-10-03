-- Fix for infinite recursion in users table policies
-- Run this in your Supabase SQL editor

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view users in their company" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Create better policies that avoid recursion

-- Allow users to view themselves directly
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Allow users to insert their own profile (needed for signup)
CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- Note: We'll add company-wide user viewing later after we test signup works
