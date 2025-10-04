-- Create a test owner account manually
-- Run this in Supabase SQL Editor

-- First, check if there's already a user
SELECT id, email, role FROM users WHERE email = 'owner@test.com';

-- If the user exists, here's their company_id:
SELECT u.id, u.email, u.role, c.id as company_id, c.name as company_name
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.email = 'owner@test.com';

-- To reset their password, go to:
-- Supabase Dashboard > Authentication > Users > Find user > "Send password reset email"
-- Or delete the user and recreate via the app
