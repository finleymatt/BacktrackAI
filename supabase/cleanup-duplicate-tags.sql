-- Cleanup script for duplicate tags
-- Run this in your Supabase SQL editor to clean up any duplicate tag names

-- First, let's see what duplicate tags exist
SELECT 
  user_id, 
  name, 
  COUNT(*) as count,
  array_agg(id) as tag_ids
FROM tags 
GROUP BY user_id, name 
HAVING COUNT(*) > 1
ORDER BY user_id, name;

-- If you want to keep the oldest tag and delete the newer ones:
-- (Uncomment the following lines if you want to run the cleanup)

/*
WITH duplicate_tags AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY user_id, name ORDER BY created_at ASC) as rn
  FROM tags
)
DELETE FROM tags 
WHERE id IN (
  SELECT id FROM duplicate_tags WHERE rn > 1
);
*/

-- Alternative: If you want to rename duplicate tags instead of deleting them:
-- (Uncomment the following lines if you want to rename instead of delete)

/*
WITH duplicate_tags AS (
  SELECT 
    id,
    name,
    ROW_NUMBER() OVER (PARTITION BY user_id, name ORDER BY created_at ASC) as rn
  FROM tags
)
UPDATE tags 
SET name = name || ' (' || rn || ')'
FROM duplicate_tags 
WHERE tags.id = duplicate_tags.id AND duplicate_tags.rn > 1;
*/
