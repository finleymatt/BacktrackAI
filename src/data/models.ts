// Database models and TypeScript types for local-first storage

export type Source = 'shared_url' | 'photo_scan';

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  title: string;
  description?: string;
  content_url?: string;
  thumbnail_url?: string;
  source: Source;
  created_at: string;
  ingested_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  name: string;
  description?: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

// Junction tables for many-to-many relationships
export interface ItemFolder {
  item_id: string;
  folder_id: string;
  created_at: string;
}

export interface ItemTag {
  item_id: string;
  tag_id: string;
  created_at: string;
}

// Database schema version for migrations
export const DB_VERSION = 1;

// Table names
export const TABLES = {
  USERS: 'users',
  ITEMS: 'items',
  FOLDERS: 'folders',
  TAGS: 'tags',
  ITEM_FOLDERS: 'item_folders',
  ITEM_TAGS: 'item_tags',
} as const;

// Database statistics for HomeScreen
export interface DatabaseStats {
  totalItems: number;
  totalFolders: number;
  totalTags: number;
  recentItems: number; // items created in last 7 days
}
