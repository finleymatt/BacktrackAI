-- Migration to add platform column and update source constraint for URL ingestion
-- Run this in your Supabase SQL Editor

-- Step 1: Add platform column to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS platform TEXT;

-- Step 2: Drop the existing constraint (this might fail if constraint name is different)
DO $$ 
BEGIN
    -- Try to drop the constraint with the exact name from the error
    BEGIN
        ALTER TABLE items DROP CONSTRAINT items_source_check;
    EXCEPTION
        WHEN undefined_object THEN
            -- Try alternative constraint names
            BEGIN
                ALTER TABLE items DROP CONSTRAINT IF EXISTS items_source_check;
            EXCEPTION
                WHEN undefined_object THEN
                    -- List all constraints to help debug
                    RAISE NOTICE 'Could not find items_source_check constraint';
            END;
    END;
END $$;

-- Step 3: Add the new constraint with 'url' included
ALTER TABLE items ADD CONSTRAINT items_source_check 
    CHECK (source IN ('shared_url', 'photo_scan', 'url'));

-- Step 4: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_items_platform ON items(platform);
CREATE INDEX IF NOT EXISTS idx_items_user_platform ON items(user_id, platform);

-- Step 5: Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'items' 
ORDER BY ordinal_position;

-- Step 6: Show current constraints
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'items'::regclass 
    AND contype = 'c';
