-- Test authentication setup
-- Run this in your Supabase SQL editor to check auth configuration

-- Check if auth schema exists
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name = 'auth';

-- Check auth tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'auth';

-- Check if auth.users table exists and has data
SELECT COUNT(*) as user_count 
FROM auth.users;

-- Check auth configuration
SELECT * FROM auth.config;
