-- Disable pgvector features and work with JSON embeddings instead
-- Use this if pgvector is not available on your Supabase instance

-- Update items table to use JSONB for embeddings (more flexible)
ALTER TABLE items 
ALTER COLUMN items_embedding TYPE JSONB 
USING CASE 
    WHEN items_embedding IS NULL THEN NULL
    WHEN items_embedding = '' THEN NULL
    ELSE items_embedding::JSONB
END;

-- Create a GIN index for JSONB embeddings (for basic search)
CREATE INDEX IF NOT EXISTS idx_items_embedding_jsonb ON items 
USING GIN (items_embedding);

-- Create a simple text-based search function (fallback)
CREATE OR REPLACE FUNCTION search_items_by_text(
  search_query TEXT,
  user_uuid UUID,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  relevance_score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    items.id,
    items.title,
    items.description,
    -- Simple relevance scoring based on text similarity
    CASE 
      WHEN items.title ILIKE '%' || search_query || '%' THEN 1.0
      WHEN items.description ILIKE '%' || search_query || '%' THEN 0.8
      ELSE 0.5
    END as relevance_score
  FROM items
  WHERE items.user_id = user_uuid
    AND (
      items.title ILIKE '%' || search_query || '%' 
      OR items.description ILIKE '%' || search_query || '%'
    )
  ORDER BY relevance_score DESC, items.created_at DESC
  LIMIT match_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_items_by_text TO authenticated;

-- Add a comment to the table
COMMENT ON COLUMN items.items_embedding IS 'JSONB array of embedding values (fallback when pgvector not available)';
