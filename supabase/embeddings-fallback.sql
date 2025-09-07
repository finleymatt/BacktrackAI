-- Semantic Search Fallback Setup for Backtrack
-- This version works without pgvector extension
-- Use this if pgvector is not available in your Supabase plan

-- Add items_embedding column as JSONB to store embeddings
DO $$
BEGIN
    -- If column doesn't exist, add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'items' 
        AND column_name = 'items_embedding'
    ) THEN
        ALTER TABLE items ADD COLUMN items_embedding JSONB;
    END IF;
END $$;

-- Create index for JSONB embeddings (less efficient than vector but works)
CREATE INDEX IF NOT EXISTS idx_items_embedding_jsonb ON items 
USING gin (items_embedding);

-- Create semantic search function using JSONB and cosine similarity
CREATE OR REPLACE FUNCTION search_items_by_embedding_jsonb(
  query_embedding JSONB,
  user_uuid UUID,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  content_url TEXT,
  thumbnail_url TEXT,
  source TEXT,
  platform TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
DECLARE
  query_array float[];
  item_array float[];
  dot_product float;
  norm_a float;
  norm_b float;
  cosine_sim float;
BEGIN
  -- Convert JSONB to float array
  SELECT ARRAY(
    SELECT jsonb_array_elements_text(query_embedding)::float
  ) INTO query_array;
  
  RETURN QUERY
  SELECT 
    items.id,
    items.title,
    items.description,
    items.content_url,
    items.thumbnail_url,
    items.source,
    items.platform,
    CASE 
      WHEN items.items_embedding IS NULL THEN 0.0
      ELSE (
        -- Calculate cosine similarity manually
        WITH embedding_data AS (
          SELECT ARRAY(
            SELECT jsonb_array_elements_text(items.items_embedding)::float
          ) as item_array
        )
        SELECT 
          CASE 
            WHEN array_length(item_array, 1) = array_length(query_array, 1) THEN
              -- Calculate dot product
              (SELECT SUM(a * b) FROM unnest(query_array, item_array) AS t(a, b)) /
              -- Calculate norms
              (sqrt((SELECT SUM(a * a) FROM unnest(query_array) AS t(a))) * 
               sqrt((SELECT SUM(b * b) FROM unnest(item_array) AS t(b))))
            ELSE 0.0
          END
        FROM embedding_data
      )
    END as similarity
  FROM items
  WHERE items.user_id = user_uuid
    AND items.items_embedding IS NOT NULL
    AND (
      -- Calculate similarity and filter by threshold
      CASE 
        WHEN items.items_embedding IS NULL THEN 0.0
        ELSE (
          WITH embedding_data AS (
            SELECT ARRAY(
              SELECT jsonb_array_elements_text(items.items_embedding)::float
            ) as item_array
          )
          SELECT 
            CASE 
              WHEN array_length(item_array, 1) = array_length(query_array, 1) THEN
                (SELECT SUM(a * b) FROM unnest(query_array, item_array) AS t(a, b)) /
                (sqrt((SELECT SUM(a * a) FROM unnest(query_array) AS t(a))) * 
                 sqrt((SELECT SUM(b * b) FROM unnest(item_array) AS t(b))))
              ELSE 0.0
            END
          FROM embedding_data
        )
      END
    ) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Create function to update item embeddings (JSONB version)
CREATE OR REPLACE FUNCTION update_item_embedding_jsonb(
  item_id UUID,
  embedding JSONB,
  user_uuid UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE items 
  SET items_embedding = embedding,
      updated_at = NOW()
  WHERE items.id = item_id 
    AND items.user_id = user_uuid;
  
  RETURN FOUND;
END;
$$;

-- Create function to batch update embeddings (JSONB version)
CREATE OR REPLACE FUNCTION batch_update_embeddings_jsonb(
  embedding_updates JSONB,
  user_uuid UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  update_count INTEGER := 0;
  item_record RECORD;
BEGIN
  FOR item_record IN 
    SELECT * FROM jsonb_to_recordset(embedding_updates) AS x(item_id UUID, embedding JSONB)
  LOOP
    UPDATE items 
    SET items_embedding = item_record.embedding,
        updated_at = NOW()
    WHERE items.id = item_record.item_id 
      AND items.user_id = user_uuid;
    
    IF FOUND THEN
      update_count := update_count + 1;
    END IF;
  END LOOP;
  
  RETURN update_count;
END;
$$;

-- Grant permissions for the new functions
GRANT EXECUTE ON FUNCTION search_items_by_embedding_jsonb TO authenticated;
GRANT EXECUTE ON FUNCTION update_item_embedding_jsonb TO authenticated;
GRANT EXECUTE ON FUNCTION batch_update_embeddings_jsonb TO authenticated;

-- Create RLS policy for embedding functions
CREATE POLICY "Users can update own item embeddings" ON items
  FOR UPDATE USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON COLUMN items.items_embedding IS 'JSONB array of embedding values for semantic search (fallback without pgvector)';
COMMENT ON FUNCTION search_items_by_embedding_jsonb IS 'Search items using JSONB embeddings with cosine similarity (fallback)';
COMMENT ON FUNCTION update_item_embedding_jsonb IS 'Update JSONB embedding for a specific item belonging to the user';
COMMENT ON FUNCTION batch_update_embeddings_jsonb IS 'Batch update JSONB embeddings for multiple items belonging to the user';
