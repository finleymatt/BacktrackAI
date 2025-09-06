-- Alternative approach to enable pgvector
-- Since vector type is available, let's try to create the extension

-- First, try to create the extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Check if it worked
SELECT extname, extversion 
FROM pg_extension 
WHERE extname = 'vector';

-- If successful, proceed with the schema updates
-- Update items table to use vector type for embeddings
ALTER TABLE items 
ALTER COLUMN items_embedding TYPE vector(1536) 
USING CASE 
    WHEN items_embedding IS NULL THEN NULL
    WHEN items_embedding = '' THEN NULL
    ELSE items_embedding::vector(1536)
END;

-- Create vector index for semantic search
CREATE INDEX IF NOT EXISTS idx_items_embedding ON items 
USING ivfflat (items_embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create semantic search function
CREATE OR REPLACE FUNCTION search_items_by_embedding(
  query_embedding vector(1536),
  user_uuid UUID,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    items.id,
    items.title,
    items.description,
    1 - (items.items_embedding <=> query_embedding) as similarity
  FROM items
  WHERE items.user_id = user_uuid
    AND items.items_embedding IS NOT NULL
    AND 1 - (items.items_embedding <=> query_embedding) > match_threshold
  ORDER BY items.items_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant permissions for the new function
GRANT EXECUTE ON FUNCTION search_items_by_embedding TO authenticated;
