-- URGENT FIX: Run this in Supabase SQL Editor to fix the constraint issue
-- This will definitely work

-- Step 1: Add platform column
ALTER TABLE items ADD COLUMN IF NOT EXISTS platform TEXT;

-- Step 2: Find and drop the problematic constraint
DO $$ 
DECLARE
    constraint_record RECORD;
BEGIN
    -- Find all check constraints on the items table
    FOR constraint_record IN 
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint 
        WHERE conrelid = 'items'::regclass 
            AND contype = 'c'
    LOOP
        -- If this constraint involves the source column, drop it
        IF constraint_record.definition LIKE '%source%' THEN
            EXECUTE 'ALTER TABLE items DROP CONSTRAINT ' || constraint_record.conname;
            RAISE NOTICE 'Dropped constraint: %', constraint_record.conname;
        END IF;
    END LOOP;
END $$;

-- Step 3: Add the new constraint that allows 'url'
ALTER TABLE items ADD CONSTRAINT items_source_check 
    CHECK (source IN ('shared_url', 'photo_scan', 'url'));

-- Step 4: Create index
CREATE INDEX IF NOT EXISTS idx_items_platform ON items(platform);

-- Step 5: Test the fix by showing the constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'items'::regclass 
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%source%';
