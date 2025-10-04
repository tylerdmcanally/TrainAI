-- Check what's in the users table
SELECT id, email, name, role, company_id, created_at 
FROM users 
ORDER BY created_at DESC;

-- Check auth.users table (this should have your auth record)
SELECT id, email, created_at, email_confirmed_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;
