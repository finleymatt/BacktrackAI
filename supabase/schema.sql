-- Backtrack Supabase Schema
-- This script sets up the database schema for cloud sync with local-first architecture

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Note: pgvector extension needs to be enabled separately in Supabase dashboard
-- Uncomment the line below after enabling pgvector in your Supabase project
-- CREATE EXTENSION IF NOT EXISTS "pgvector"; -- For semantic search (optional)

-- Users table (mirrors local users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Items table (mirrors local items with user_id for RLS)
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_url TEXT,
  thumbnail_url TEXT,
  source TEXT NOT NULL CHECK (source IN ('shared_url', 'photo_scan', 'url', 'screenshot')),
  platform TEXT, -- Platform type for URL items (youtube, spotify, instagram, generic)
  source_date TEXT, -- For screenshots, this is the creation time from Photos EXIF
  ocr_text TEXT,
  ocr_done BOOLEAN NOT NULL DEFAULT FALSE, -- Legacy field - kept for backward compatibility
  ocr_status TEXT CHECK (ocr_status IN ('pending', 'done', 'error')), -- New field for tracking OCR processing status
  items_embedding TEXT, -- Will be converted to vector(1536) after enabling pgvector
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Folders table (mirrors local folders with user_id for RLS)
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tags table (mirrors local tags with user_id for RLS)
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name) -- Users can have unique tag names
);

-- Item-Folder junction table
CREATE TABLE IF NOT EXISTS item_folders (
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (item_id, folder_id)
);

-- Item-Tag junction table
CREATE TABLE IF NOT EXISTS item_tags (
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (item_id, tag_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at);
CREATE INDEX IF NOT EXISTS idx_items_source ON items(source);
CREATE INDEX IF NOT EXISTS idx_items_platform ON items(platform);
CREATE INDEX IF NOT EXISTS idx_items_user_platform ON items(user_id, platform);
-- Uncomment after enabling pgvector:
-- CREATE INDEX IF NOT EXISTS idx_items_embedding ON items USING ivfflat (items_embedding vector_cosine_ops); -- For semantic search

CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_name ON folders(name);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

CREATE INDEX IF NOT EXISTS idx_item_folders_item_id ON item_folders(item_id);
CREATE INDEX IF NOT EXISTS idx_item_folders_folder_id ON item_folders(folder_id);

CREATE INDEX IF NOT EXISTS idx_item_tags_item_id ON item_tags(item_id);
CREATE INDEX IF NOT EXISTS idx_item_tags_tag_id ON item_tags(tag_id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
-- Users policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Items policies
CREATE POLICY "Users can view own items" ON items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own items" ON items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own items" ON items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own items" ON items
  FOR DELETE USING (auth.uid() = user_id);

-- Folders policies
CREATE POLICY "Users can view own folders" ON folders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own folders" ON folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders" ON folders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders" ON folders
  FOR DELETE USING (auth.uid() = user_id);

-- Tags policies
CREATE POLICY "Users can view own tags" ON tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tags" ON tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags" ON tags
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags" ON tags
  FOR DELETE USING (auth.uid() = user_id);

-- Item-Folders policies
CREATE POLICY "Users can view own item_folders" ON item_folders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM items WHERE items.id = item_folders.item_id AND items.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own item_folders" ON item_folders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM items WHERE items.id = item_folders.item_id AND items.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own item_folders" ON item_folders
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM items WHERE items.id = item_folders.item_id AND items.user_id = auth.uid()
    )
  );

-- Item-Tags policies
CREATE POLICY "Users can view own item_tags" ON item_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM items WHERE items.id = item_tags.item_id AND items.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own item_tags" ON item_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM items WHERE items.id = item_tags.item_id AND items.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own item_tags" ON item_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM items WHERE items.id = item_tags.item_id AND items.user_id = auth.uid()
    )
  );

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function for semantic search (optional)
-- Uncomment and modify after enabling pgvector extension
/*
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
*/

-- Grant necessary permissions
-- Note: In production, you might want to create specific roles and grant permissions more granularly
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
