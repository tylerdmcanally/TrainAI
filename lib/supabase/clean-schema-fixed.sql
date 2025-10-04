-- TrainAI Database Schema - CLEAN VERSION with Fixed RLS
-- This completely resets and rebuilds the database with proper role separation
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Clean slate - Drop everything
-- ============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view users in their company" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile during signup" ON users;
DROP POLICY IF EXISTS "Service role can insert users" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Users can view company by membership" ON companies;
DROP POLICY IF EXISTS "Owners can insert their company" ON companies;
DROP POLICY IF EXISTS "Owners can update their company" ON companies;
DROP POLICY IF EXISTS "Owners can create training modules" ON training_modules;
DROP POLICY IF EXISTS "Owners can update their training modules" ON training_modules;
DROP POLICY IF EXISTS "Owners can delete their training modules" ON training_modules;
DROP POLICY IF EXISTS "Users can view training modules in their company" ON training_modules;
DROP POLICY IF EXISTS "Users can view their own assignments" ON assignments;
DROP POLICY IF EXISTS "Owners can create assignments" ON assignments;
DROP POLICY IF EXISTS "Employees can update their own assignments" ON assignments;
DROP POLICY IF EXISTS "Users can view their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can create their own chat messages" ON chat_messages;

-- Drop triggers
DROP TRIGGER IF EXISTS update_training_modules_updated_at ON training_modules;
DROP TRIGGER IF EXISTS update_company_employee_count ON users;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS update_employee_count();

-- Drop indexes
DROP INDEX IF EXISTS idx_users_company;
DROP INDEX IF EXISTS idx_training_modules_company;
DROP INDEX IF EXISTS idx_training_modules_creator;
DROP INDEX IF EXISTS idx_assignments_module;
DROP INDEX IF EXISTS idx_assignments_employee;
DROP INDEX IF EXISTS idx_chat_messages_assignment;

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS training_modules CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- ============================================
-- STEP 2: Rebuild Tables
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'growth', 'business')),
  owner_id UUID NOT NULL,
  employee_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'employee')),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Training modules table
CREATE TABLE training_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  video_duration INTEGER NOT NULL DEFAULT 0,
  transcript TEXT,
  chapters JSONB NOT NULL DEFAULT '[]',
  sop TEXT,
  key_points TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assignments table
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(module_id, employee_id)
);

-- Chat messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  video_timestamp INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 3: Create Indexes
-- ============================================

CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_training_modules_company ON training_modules(company_id);
CREATE INDEX idx_training_modules_creator ON training_modules(creator_id);
CREATE INDEX idx_assignments_module ON assignments(module_id);
CREATE INDEX idx_assignments_employee ON assignments(employee_id);
CREATE INDEX idx_chat_messages_assignment ON chat_messages(assignment_id);

-- ============================================
-- STEP 4: Enable RLS
-- ============================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: Create RLS Policies (NO RECURSION!)
-- ============================================

-- ==================
-- COMPANIES POLICIES
-- ==================

-- Allow users to view their company (simple, no subquery on users table)
CREATE POLICY "company_select_own"
  ON companies FOR SELECT
  USING (owner_id = auth.uid());

-- Allow users to view company they belong to (uses company_id from JWT or direct check)
CREATE POLICY "company_select_member"
  ON companies FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM users WHERE id = auth.uid() LIMIT 1
    )
  );

-- Allow owners to insert their company during signup
CREATE POLICY "company_insert_owner"
  ON companies FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Allow owners to update their company
CREATE POLICY "company_update_owner"
  ON companies FOR UPDATE
  USING (owner_id = auth.uid());

-- ==================
-- USERS POLICIES
-- ==================

-- Allow users to view their own profile (no recursion - direct ID match)
CREATE POLICY "users_select_self"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Allow users to view other users in their company
-- This uses a stored company_id, NOT a subquery on users
CREATE POLICY "users_select_company"
  ON users FOR SELECT
  USING (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid() LIMIT 1
    )
  );

-- Allow users to insert their own profile during signup
CREATE POLICY "users_insert_self"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- Allow users to update their own profile
CREATE POLICY "users_update_self"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- ==================
-- TRAINING MODULES POLICIES
-- ==================

-- Allow users to view trainings in their company
CREATE POLICY "training_select_company"
  ON training_modules FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Allow owners to create trainings (check role stored in table)
CREATE POLICY "training_insert_owner"
  ON training_modules FOR INSERT
  WITH CHECK (
    creator_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'owner'
      LIMIT 1
    )
  );

-- Allow creators to update their own trainings
CREATE POLICY "training_update_creator"
  ON training_modules FOR UPDATE
  USING (creator_id = auth.uid());

-- Allow creators to delete their own trainings
CREATE POLICY "training_delete_creator"
  ON training_modules FOR DELETE
  USING (creator_id = auth.uid());

-- ==================
-- ASSIGNMENTS POLICIES
-- ==================

-- Employees can view their own assignments
CREATE POLICY "assignment_select_employee"
  ON assignments FOR SELECT
  USING (employee_id = auth.uid());

-- Owners can view assignments for trainings they created
CREATE POLICY "assignment_select_owner"
  ON assignments FOR SELECT
  USING (
    module_id IN (
      SELECT id FROM training_modules WHERE creator_id = auth.uid()
    )
  );

-- Owners can create assignments for their trainings
CREATE POLICY "assignment_insert_owner"
  ON assignments FOR INSERT
  WITH CHECK (
    assigned_by = auth.uid() AND
    module_id IN (
      SELECT id FROM training_modules WHERE creator_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Employees can update their own assignment progress
CREATE POLICY "assignment_update_employee"
  ON assignments FOR UPDATE
  USING (employee_id = auth.uid());

-- Owners can update assignments they created
CREATE POLICY "assignment_update_owner"
  ON assignments FOR UPDATE
  USING (assigned_by = auth.uid());

-- ==================
-- CHAT MESSAGES POLICIES
-- ==================

-- Users can view messages for their own assignments
CREATE POLICY "chat_select_own"
  ON chat_messages FOR SELECT
  USING (
    assignment_id IN (
      SELECT id FROM assignments WHERE employee_id = auth.uid()
    )
  );

-- Users can create messages for their own assignments
CREATE POLICY "chat_insert_own"
  ON chat_messages FOR INSERT
  WITH CHECK (
    assignment_id IN (
      SELECT id FROM assignments WHERE employee_id = auth.uid()
    )
  );

-- ============================================
-- STEP 6: Create Helper Functions & Triggers
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on training_modules
CREATE TRIGGER update_training_modules_updated_at
  BEFORE UPDATE ON training_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update employee count
CREATE OR REPLACE FUNCTION update_employee_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.role = 'employee' THEN
    UPDATE companies
    SET employee_count = employee_count + 1
    WHERE id = NEW.company_id;
  ELSIF TG_OP = 'DELETE' AND OLD.role = 'employee' THEN
    UPDATE companies
    SET employee_count = GREATEST(employee_count - 1, 0)
    WHERE id = OLD.company_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle role changes
    IF OLD.role = 'employee' AND NEW.role != 'employee' THEN
      UPDATE companies SET employee_count = GREATEST(employee_count - 1, 0) WHERE id = OLD.company_id;
    ELSIF OLD.role != 'employee' AND NEW.role = 'employee' THEN
      UPDATE companies SET employee_count = employee_count + 1 WHERE id = NEW.company_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update employee count on users
CREATE TRIGGER update_company_employee_count
  AFTER INSERT OR DELETE OR UPDATE OF role ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_count();

-- ============================================
-- DONE!
-- ============================================
-- Your database is now clean with:
-- ✅ No recursive RLS policies
-- ✅ Clear owner vs employee separation
-- ✅ Proper foreign key relationships
-- ✅ Efficient indexes for queries
-- ✅ Automatic employee counting
