-- TEST: Check if the constraint was updated
-- Run this first to see what's currently in your Supabase database

-- Check if platform column exists
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'items' 
    AND column_name = 'platform';

-- Check current constraints on source column
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'items'::regclass 
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%source%';

-- Try to insert a test record with source='url' (this will fail if constraint is wrong)
-- DO NOT run this if you don't want test data
-- INSERT INTO items (id, user_id, title, source) 
-- VALUES (gen_random_uuid(), gen_random_uuid(), 'Test URL Item', 'url');
