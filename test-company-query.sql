-- Test if owner can read their own company_id
-- Run this in Supabase SQL Editor while logged in as the owner

SELECT company_id FROM users WHERE id = auth.uid();
