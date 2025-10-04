-- Debug RLS status and policies
-- Run this in your Supabase SQL editor to check current state

-- Check if RLS is enabled on tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'companies', 'training_modules', 'assignments', 'chat_messages')
ORDER BY tablename;

-- Check existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check if there are any users in the database
SELECT id, email, name, role, company_id, created_at 
FROM users 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if there are any companies
SELECT id, name, owner_id, created_at 
FROM companies 
ORDER BY created_at DESC 
LIMIT 5;
