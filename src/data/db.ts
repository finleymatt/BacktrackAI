import * as SQLite from 'expo-sqlite';
import { DB_VERSION, TABLES } from './models';

// Database instance
let db: SQLite.SQLiteDatabase | null = null;

// Initialize database with migrations
export const initDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) {
    return db;
  }

  try {
    db = await SQLite.openDatabaseAsync('backtrack.db');
    
    // Enable foreign keys
    await db.execAsync('PRAGMA foreign_keys = ON;');
    
    // Run migrations
    await runMigrations(db);
    
    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

// Get database instance (initializes if needed)
export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!db) {
    return await initDatabase();
  }
  return db;
};

// Migration system
const runMigrations = async (database: SQLite.SQLiteDatabase): Promise<void> => {
  // Get current version
  const result = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = result?.user_version || 0;

  if (currentVersion < DB_VERSION) {
    console.log(`Running migrations from version ${currentVersion} to ${DB_VERSION}`);
    
    // Migration 1: Create initial tables
    if (currentVersion < 1) {
      await migration1_createTables(database);
    }
    
    // Migration 2: Add OCR fields to items table
    if (currentVersion < 2) {
      await migration2_addOcrFields(database);
    }
    
    // Set new version
    await database.execAsync(`PRAGMA user_version = ${DB_VERSION};`);
    console.log(`Database migrated to version ${DB_VERSION}`);
  }
};

// Migration 1: Create all tables
const migration1_createTables = async (database: SQLite.SQLiteDatabase): Promise<void> => {
  const migrations = [
    // Users table (local shadow)
    `CREATE TABLE IF NOT EXISTS ${TABLES.USERS} (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,

    // Items table
    `CREATE TABLE IF NOT EXISTS ${TABLES.ITEMS} (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      content_url TEXT,
      thumbnail_url TEXT,
      source TEXT NOT NULL CHECK (source IN ('shared_url', 'photo_scan')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      ingested_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,

    // Folders table
    `CREATE TABLE IF NOT EXISTS ${TABLES.FOLDERS} (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,

    // Tags table
    `CREATE TABLE IF NOT EXISTS ${TABLES.TAGS} (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      color TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,

    // Item-Folder junction table
    `CREATE TABLE IF NOT EXISTS ${TABLES.ITEM_FOLDERS} (
      item_id TEXT NOT NULL,
      folder_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (item_id, folder_id),
      FOREIGN KEY (item_id) REFERENCES ${TABLES.ITEMS} (id) ON DELETE CASCADE,
      FOREIGN KEY (folder_id) REFERENCES ${TABLES.FOLDERS} (id) ON DELETE CASCADE
    );`,

    // Item-Tag junction table
    `CREATE TABLE IF NOT EXISTS ${TABLES.ITEM_TAGS} (
      item_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (item_id, tag_id),
      FOREIGN KEY (item_id) REFERENCES ${TABLES.ITEMS} (id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES ${TABLES.TAGS} (id) ON DELETE CASCADE
    );`,

    // Create indexes for better performance
    `CREATE INDEX IF NOT EXISTS idx_items_created_at ON ${TABLES.ITEMS} (created_at);`,
    `CREATE INDEX IF NOT EXISTS idx_items_source ON ${TABLES.ITEMS} (source);`,
    `CREATE INDEX IF NOT EXISTS idx_folders_name ON ${TABLES.FOLDERS} (name);`,
    `CREATE INDEX IF NOT EXISTS idx_tags_name ON ${TABLES.TAGS} (name);`,
    `CREATE INDEX IF NOT EXISTS idx_item_folders_item_id ON ${TABLES.ITEM_FOLDERS} (item_id);`,
    `CREATE INDEX IF NOT EXISTS idx_item_folders_folder_id ON ${TABLES.ITEM_FOLDERS} (folder_id);`,
    `CREATE INDEX IF NOT EXISTS idx_item_tags_item_id ON ${TABLES.ITEM_TAGS} (item_id);`,
    `CREATE INDEX IF NOT EXISTS idx_item_tags_tag_id ON ${TABLES.ITEM_TAGS} (tag_id);`,
  ];

  for (const migration of migrations) {
    await database.execAsync(migration);
  }
};

// Migration 2: Add OCR fields to items table
const migration2_addOcrFields = async (database: SQLite.SQLiteDatabase): Promise<void> => {
  console.log('Running migration 2: Adding OCR fields to items table');
  
  try {
    // Check if columns already exist before adding them
    const tableInfo = await database.getAllAsync(`PRAGMA table_info(${TABLES.ITEMS});`);
    const existingColumns = tableInfo.map((col: any) => col.name);
    
    const migrations = [];
    
    // Only add columns if they don't exist
    if (!existingColumns.includes('ocr_text')) {
      migrations.push(`ALTER TABLE ${TABLES.ITEMS} ADD COLUMN ocr_text TEXT;`);
    }
    
    if (!existingColumns.includes('ocr_done')) {
      migrations.push(`ALTER TABLE ${TABLES.ITEMS} ADD COLUMN ocr_done BOOLEAN NOT NULL DEFAULT 0;`);
    }
    
    // Always try to create indexes (they won't fail if they exist)
    migrations.push(`CREATE INDEX IF NOT EXISTS idx_items_ocr_text ON ${TABLES.ITEMS} (ocr_text);`);
    migrations.push(`CREATE INDEX IF NOT EXISTS idx_items_ocr_done ON ${TABLES.ITEMS} (ocr_done);`);

    for (const migration of migrations) {
      await database.execAsync(migration);
    }
    
    console.log('Migration 2 completed: OCR fields added to items table');
  } catch (error) {
    console.error('Migration 2 failed:', error);
    // Don't throw - let the app continue even if migration fails
  }
};

// Utility function to generate UUIDs
export const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Utility function to get current timestamp
export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};

// Close database connection (for cleanup)
export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.closeAsync();
    db = null;
  }
};

// Reset database (for development/testing)
export const resetDatabase = async (): Promise<void> => {
  if (db) {
    await db.closeAsync();
    db = null;
  }
  
  // Delete the database file
  const { deleteAsync, documentDirectory } = await import('expo-file-system');
  if (documentDirectory) {
    try {
      await deleteAsync(`${documentDirectory}SQLite/backtrack.db`);
      console.log('Database file deleted');
    } catch (error) {
      console.log('Database file may not exist or could not be deleted:', error);
    }
  }
  
  // Reinitialize
  await initDatabase();
};
