-- Simple fix for the source constraint issue
-- Run this if the main migration fails

-- First, let's see what constraints exist
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'items'::regclass 
    AND contype = 'c';

-- Add platform column if it doesn't exist
ALTER TABLE items ADD COLUMN IF NOT EXISTS platform TEXT;

-- Drop ALL check constraints on the source column
DO $$ 
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'items'::regclass 
            AND contype = 'c'
            AND pg_get_constraintdef(oid) LIKE '%source%'
    LOOP
        EXECUTE 'ALTER TABLE items DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- Add the new constraint
ALTER TABLE items ADD CONSTRAINT items_source_check 
    CHECK (source IN ('shared_url', 'photo_scan', 'url'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_items_platform ON items(platform);

-- Verify the fix
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'items'::regclass 
    AND contype = 'c';
