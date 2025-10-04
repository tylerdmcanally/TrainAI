-- Wipe all data for a fresh start
-- Run this in your Supabase SQL editor

-- Delete all data (in correct order due to foreign key constraints)
DELETE FROM chat_messages;
DELETE FROM assignments;
DELETE FROM training_modules;
DELETE FROM users;
DELETE FROM companies;

-- Also delete from auth.users (this will cascade and clean everything)
-- Note: This requires admin access
DELETE FROM auth.users;

-- Verify everything is clean
SELECT 'chat_messages' as table_name, COUNT(*) as count FROM chat_messages
UNION ALL
SELECT 'assignments', COUNT(*) FROM assignments
UNION ALL
SELECT 'training_modules', COUNT(*) FROM training_modules
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'companies', COUNT(*) FROM companies
UNION ALL
SELECT 'auth.users', COUNT(*) FROM auth.users;
