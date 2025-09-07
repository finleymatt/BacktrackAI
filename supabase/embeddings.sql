-- Semantic Search Setup for Backtrack
-- This file sets up pgvector and semantic search functionality
-- Run this AFTER the main schema.sql has been executed successfully

-- Enable vector extension (pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

-- Update items table to use vector type for embeddings
-- First, we need to handle existing data if any
DO $$
BEGIN
    -- Check if items_embedding column exists and is TEXT type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'items' 
        AND column_name = 'items_embedding' 
        AND data_type = 'text'
    ) THEN
        -- Convert TEXT column to vector(1536)
        ALTER TABLE items 
        ALTER COLUMN items_embedding TYPE vector(1536) 
        USING CASE 
            WHEN items_embedding IS NULL THEN NULL
            ELSE items_embedding::vector(1536)
        END;
    END IF;
    
    -- If column doesn't exist, add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'items' 
        AND column_name = 'items_embedding'
    ) THEN
        ALTER TABLE items ADD COLUMN items_embedding vector(1536);
    END IF;
END $$;

-- Create vector index for semantic search
CREATE INDEX IF NOT EXISTS idx_items_embedding ON items 
USING ivfflat (items_embedding vector_cosine_ops) 
WITH (lists = 100);

-- Drop existing function if it exists (to handle return type changes)
DROP FUNCTION IF EXISTS search_items_by_embedding(vector, uuid, double precision, integer);

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
  content_url TEXT,
  thumbnail_url TEXT,
  source TEXT,
  platform TEXT,
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
    items.content_url,
    items.thumbnail_url,
    items.source,
    items.platform,
    1 - (items.items_embedding <=> query_embedding) as similarity
  FROM items
  WHERE items.user_id = user_uuid
    AND items.items_embedding IS NOT NULL
    AND 1 - (items.items_embedding <=> query_embedding) > match_threshold
  ORDER BY items.items_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS update_item_embedding(uuid, vector, uuid);
DROP FUNCTION IF EXISTS batch_update_embeddings(jsonb, uuid);

-- Create function to update item embeddings
CREATE OR REPLACE FUNCTION update_item_embedding(
  item_id UUID,
  embedding vector(1536),
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

-- Create function to batch update embeddings
CREATE OR REPLACE FUNCTION batch_update_embeddings(
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
    SELECT * FROM jsonb_to_recordset(embedding_updates) AS x(item_id UUID, embedding vector(1536))
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
GRANT EXECUTE ON FUNCTION search_items_by_embedding TO authenticated;
GRANT EXECUTE ON FUNCTION update_item_embedding TO authenticated;
GRANT EXECUTE ON FUNCTION batch_update_embeddings TO authenticated;

-- Create RLS policy for embedding functions
CREATE POLICY "Users can update own item embeddings" ON items
  FOR UPDATE USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON COLUMN items.items_embedding IS 'Vector embedding for semantic search (1536 dimensions for OpenAI embeddings)';
COMMENT ON FUNCTION search_items_by_embedding IS 'Search items using vector similarity with user isolation';
COMMENT ON FUNCTION update_item_embedding IS 'Update embedding for a specific item belonging to the user';
COMMENT ON FUNCTION batch_update_embeddings IS 'Batch update embeddings for multiple items belonging to the user';
