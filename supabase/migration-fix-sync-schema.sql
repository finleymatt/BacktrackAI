-- Migration to fix sync schema issues
-- Run this in your Supabase SQL editor to add missing columns

-- Add missing columns to items table
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS source_date TEXT,
ADD COLUMN IF NOT EXISTS ocr_text TEXT,
ADD COLUMN IF NOT EXISTS ocr_done BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ocr_status TEXT CHECK (ocr_status IN ('pending', 'done', 'error'));

-- Update source constraint to include 'screenshot'
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_source_check;
ALTER TABLE items ADD CONSTRAINT items_source_check 
CHECK (source IN ('shared_url', 'photo_scan', 'url', 'screenshot'));

-- Add missing column to folders table
ALTER TABLE folders 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_items_source_date ON items (source_date);
CREATE INDEX IF NOT EXISTS idx_items_ocr_done ON items (ocr_done);
CREATE INDEX IF NOT EXISTS idx_items_ocr_status ON items (ocr_status);
CREATE INDEX IF NOT EXISTS idx_folders_is_public ON folders (is_public);

-- Verify the changes
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name IN ('items', 'folders', 'tags', 'users')
ORDER BY table_name, ordinal_position;
