-- TrainAI Database - FINAL FIX for Infinite Recursion
-- This uses a security definer function to break the recursion

-- ============================================
-- STEP 1: Create helper function to get user's company
-- ============================================

-- This function runs with SECURITY DEFINER, bypassing RLS
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- ============================================
-- STEP 2: Drop and recreate USERS policies
-- ============================================

-- Drop all users policies
DROP POLICY IF EXISTS "users_select_self" ON users;
DROP POLICY IF EXISTS "users_select_company" ON users;
DROP POLICY IF EXISTS "users_insert_self" ON users;
DROP POLICY IF EXISTS "users_update_self" ON users;

-- ==================
-- USERS POLICIES - Using security definer function
-- ==================

-- Allow users to view their own profile
CREATE POLICY "users_select_self"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Allow users to view other users in their company
-- Uses security definer function to avoid recursion
CREATE POLICY "users_select_company"
  ON users FOR SELECT
  USING (company_id = public.get_user_company_id());

-- Allow users to insert their own profile during signup
CREATE POLICY "users_insert_self"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- Allow users to update their own profile
CREATE POLICY "users_update_self"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- ============================================
-- STEP 3: Update COMPANIES policies to use the function
-- ============================================

-- Drop existing company policies
DROP POLICY IF EXISTS "company_select_own" ON companies;
DROP POLICY IF EXISTS "company_select_member" ON companies;
DROP POLICY IF EXISTS "company_insert_owner" ON companies;
DROP POLICY IF EXISTS "company_update_owner" ON companies;

-- Companies policies - using the helper function
CREATE POLICY "company_select_own"
  ON companies FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "company_select_member"
  ON companies FOR SELECT
  USING (id = public.get_user_company_id());

CREATE POLICY "company_insert_owner"
  ON companies FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "company_update_owner"
  ON companies FOR UPDATE
  USING (owner_id = auth.uid());

-- ============================================
-- DONE!
-- ============================================
-- The security definer function breaks the recursion by:
-- 1. Running with elevated privileges (SECURITY DEFINER)
-- 2. Bypassing RLS when looking up the user's company_id
-- 3. Preventing infinite policy checks
--
-- Now you can:
-- ✅ Sign up as owner without recursion errors
-- ✅ Query users in your company
-- ✅ Use all role-based features
