-- TrainAI Database Schema
-- Run this in your Supabase SQL editor after creating your project

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

-- Indexes for better query performance
CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_training_modules_company ON training_modules(company_id);
CREATE INDEX idx_training_modules_creator ON training_modules(creator_id);
CREATE INDEX idx_assignments_module ON assignments(module_id);
CREATE INDEX idx_assignments_employee ON assignments(employee_id);
CREATE INDEX idx_chat_messages_assignment ON chat_messages(assignment_id);

-- Row Level Security (RLS) Policies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Companies policies
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (
    owner_id = auth.uid() OR
    id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Owners can update their company"
  ON companies FOR UPDATE
  USING (owner_id = auth.uid());

-- Users policies
CREATE POLICY "Users can view users in their company"
  ON users FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- Training modules policies
CREATE POLICY "Users can view training modules in their company"
  ON training_modules FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Owners can create training modules"
  ON training_modules FOR INSERT
  WITH CHECK (
    creator_id = auth.uid() AND
    (SELECT role FROM users WHERE id = auth.uid()) = 'owner'
  );

CREATE POLICY "Owners can update their training modules"
  ON training_modules FOR UPDATE
  USING (
    creator_id = auth.uid() AND
    (SELECT role FROM users WHERE id = auth.uid()) = 'owner'
  );

CREATE POLICY "Owners can delete their training modules"
  ON training_modules FOR DELETE
  USING (
    creator_id = auth.uid() AND
    (SELECT role FROM users WHERE id = auth.uid()) = 'owner'
  );

-- Assignments policies
CREATE POLICY "Users can view their own assignments"
  ON assignments FOR SELECT
  USING (
    employee_id = auth.uid() OR
    module_id IN (
      SELECT id FROM training_modules WHERE creator_id = auth.uid()
    )
  );

CREATE POLICY "Owners can create assignments"
  ON assignments FOR INSERT
  WITH CHECK (
    module_id IN (
      SELECT id FROM training_modules WHERE creator_id = auth.uid()
    )
  );

CREATE POLICY "Employees can update their own assignments"
  ON assignments FOR UPDATE
  USING (employee_id = auth.uid());

-- Chat messages policies
CREATE POLICY "Users can view their own chat messages"
  ON chat_messages FOR SELECT
  USING (
    assignment_id IN (SELECT id FROM assignments WHERE employee_id = auth.uid())
  );

CREATE POLICY "Users can create their own chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    assignment_id IN (SELECT id FROM assignments WHERE employee_id = auth.uid())
  );

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
  IF TG_OP = 'INSERT' THEN
    UPDATE companies
    SET employee_count = employee_count + 1
    WHERE id = NEW.company_id AND NEW.role = 'employee';
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE companies
    SET employee_count = employee_count - 1
    WHERE id = OLD.company_id AND OLD.role = 'employee';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update employee count on users
CREATE TRIGGER update_company_employee_count
  AFTER INSERT OR DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_count();
