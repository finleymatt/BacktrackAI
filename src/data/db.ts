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
    
    // Force ensure platform column exists (critical for URL ingestion)
    await forceEnsurePlatformColumn(db);
    
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
    
    // Migration 3: Add platform field and update source constraint
    if (currentVersion < 3) {
      await migration3_addPlatformField(database);
    }
    
    // Always ensure platform column exists (safety check)
    await ensurePlatformColumnExists(database);
    
    // Force recreate items table if constraint is wrong (SQLite limitation)
    await forceRecreateItemsTableIfNeeded(database);
    
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
      source TEXT NOT NULL CHECK (source IN ('shared_url', 'photo_scan', 'url')),
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

// Migration 3: Add platform field to items table
const migration3_addPlatformField = async (database: SQLite.SQLiteDatabase): Promise<void> => {
  console.log('Running migration 3: Adding platform field to items table');
  
  try {
    // Check if platform column already exists
    const tableInfo = await database.getAllAsync(`PRAGMA table_info(${TABLES.ITEMS});`);
    const existingColumns = tableInfo.map((col: any) => col.name);
    
    const migrations = [];
    
    // Only add platform column if it doesn't exist
    if (!existingColumns.includes('platform')) {
      migrations.push(`ALTER TABLE ${TABLES.ITEMS} ADD COLUMN platform TEXT;`);
    }
    
    // Create index for platform field
    migrations.push(`CREATE INDEX IF NOT EXISTS idx_items_platform ON ${TABLES.ITEMS} (platform);`);

    for (const migration of migrations) {
      await database.execAsync(migration);
    }
    
    console.log('Migration 3 completed: Platform field added to items table');
  } catch (error) {
    console.error('Migration 3 failed:', error);
    // Don't throw - let the app continue even if migration fails
  }
};

// Ensure platform column exists (safety check)
const ensurePlatformColumnExists = async (database: SQLite.SQLiteDatabase): Promise<void> => {
  try {
    // Check if platform column exists
    const tableInfo = await database.getAllAsync(`PRAGMA table_info(${TABLES.ITEMS});`);
    const existingColumns = tableInfo.map((col: any) => col.name);
    
    if (!existingColumns.includes('platform')) {
      console.log('Platform column missing, adding it now...');
      await database.execAsync(`ALTER TABLE ${TABLES.ITEMS} ADD COLUMN platform TEXT;`);
      await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_items_platform ON ${TABLES.ITEMS} (platform);`);
      console.log('Platform column added successfully');
    }
  } catch (error) {
    console.error('Error ensuring platform column exists:', error);
    // Don't throw - let the app continue
  }
};

// Force ensure platform column exists (more aggressive approach)
const forceEnsurePlatformColumn = async (database: SQLite.SQLiteDatabase): Promise<void> => {
  try {
    console.log('Force checking platform column...');
    
    // Try to add the platform column (will fail silently if it already exists)
    try {
      await database.execAsync(`ALTER TABLE ${TABLES.ITEMS} ADD COLUMN platform TEXT;`);
      console.log('Platform column added successfully');
    } catch (error) {
      // Column might already exist, which is fine
      console.log('Platform column already exists or error adding it:', error.message);
    }
    
    // Always try to create the index (will fail silently if it already exists)
    try {
      await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_items_platform ON ${TABLES.ITEMS} (platform);`);
      console.log('Platform index created/verified');
    } catch (error) {
      console.log('Error creating platform index:', error.message);
    }
    
    // Verify the column exists
    const tableInfo = await database.getAllAsync(`PRAGMA table_info(${TABLES.ITEMS});`);
    const existingColumns = tableInfo.map((col: any) => col.name);
    console.log('Current table columns:', existingColumns);
    
    if (existingColumns.includes('platform')) {
      console.log('✅ Platform column confirmed to exist');
    } else {
      console.error('❌ Platform column still missing after force check');
    }
    
  } catch (error) {
    console.error('Error in force ensure platform column:', error);
    // Don't throw - let the app continue
  }
};

// Force recreate items table if constraint is wrong (SQLite limitation)
const forceRecreateItemsTableIfNeeded = async (database: SQLite.SQLiteDatabase): Promise<void> => {
  try {
    console.log('Checking if items table needs to be recreated...');
    
    // Check if we can insert a test record with source='url'
    try {
      await database.runAsync(
        `INSERT INTO ${TABLES.ITEMS} (id, title, source, platform, ocr_done, created_at, ingested_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['test-constraint-check', 'Test', 'url', 'generic', 1, new Date().toISOString(), new Date().toISOString(), new Date().toISOString()]
      );
      
      // If successful, clean up and return
      await database.runAsync(`DELETE FROM ${TABLES.ITEMS} WHERE id = ?`, ['test-constraint-check']);
      console.log('✅ Items table constraint is correct');
      return;
    } catch (error) {
      console.log('❌ Items table constraint is wrong, recreating...');
    }
    
    // Check if table exists first
    const tableExists = await database.getFirstAsync(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      [TABLES.ITEMS]
    );
    
    if (!tableExists) {
      console.log('Items table does not exist, creating with correct constraint...');
      // Create the table with correct constraint
      await database.execAsync(`
        CREATE TABLE ${TABLES.ITEMS} (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          content_url TEXT,
          thumbnail_url TEXT,
          source TEXT NOT NULL CHECK (source IN ('shared_url', 'photo_scan', 'url')),
          platform TEXT,
          ocr_text TEXT,
          ocr_done BOOLEAN NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          ingested_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);
      
      // Create indexes
      await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_items_created_at ON ${TABLES.ITEMS} (created_at);`);
      await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_items_source ON ${TABLES.ITEMS} (source);`);
      await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_items_platform ON ${TABLES.ITEMS} (platform);`);
      await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_items_ocr_text ON ${TABLES.ITEMS} (ocr_text);`);
      await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_items_ocr_done ON ${TABLES.ITEMS} (ocr_done);`);
      
      console.log('✅ Items table created successfully with correct constraint');
      return;
    }
    
    // Get all existing data
    const existingItems = await database.getAllAsync(`SELECT * FROM ${TABLES.ITEMS}`);
    const existingItemFolders = await database.getAllAsync(`SELECT * FROM ${TABLES.ITEM_FOLDERS}`);
    const existingItemTags = await database.getAllAsync(`SELECT * FROM ${TABLES.ITEM_TAGS}`);
    
    console.log(`Backing up ${existingItems.length} items, ${existingItemFolders.length} item-folder relationships, ${existingItemTags.length} item-tag relationships`);
    
    // Drop the old table
    await database.execAsync(`DROP TABLE ${TABLES.ITEMS}`);
    
    // Create the new table with correct constraint
    await database.execAsync(`
      CREATE TABLE ${TABLES.ITEMS} (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        content_url TEXT,
        thumbnail_url TEXT,
        source TEXT NOT NULL CHECK (source IN ('shared_url', 'photo_scan', 'url')),
        platform TEXT,
        ocr_text TEXT,
        ocr_done BOOLEAN NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        ingested_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    
    // Recreate indexes
    await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_items_created_at ON ${TABLES.ITEMS} (created_at);`);
    await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_items_source ON ${TABLES.ITEMS} (source);`);
    await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_items_platform ON ${TABLES.ITEMS} (platform);`);
    await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_items_ocr_text ON ${TABLES.ITEMS} (ocr_text);`);
    await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_items_ocr_done ON ${TABLES.ITEMS} (ocr_done);`);
    
    // Restore the data
    for (const item of existingItems) {
      await database.runAsync(
        `INSERT INTO ${TABLES.ITEMS} (id, title, description, content_url, thumbnail_url, source, platform, ocr_text, ocr_done, created_at, ingested_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.title,
          item.description || null,
          item.content_url || null,
          item.thumbnail_url || null,
          item.source,
          item.platform || null,
          item.ocr_text || null,
          item.ocr_done ? 1 : 0,
          item.created_at,
          item.ingested_at,
          item.updated_at
        ]
      );
    }
    
    // Restore relationships
    for (const rel of existingItemFolders) {
      await database.runAsync(
        `INSERT INTO ${TABLES.ITEM_FOLDERS} (item_id, folder_id, created_at)
         VALUES (?, ?, ?)`,
        [rel.item_id, rel.folder_id, rel.created_at]
      );
    }
    
    for (const rel of existingItemTags) {
      await database.runAsync(
        `INSERT INTO ${TABLES.ITEM_TAGS} (item_id, tag_id, created_at)
         VALUES (?, ?, ?)`,
        [rel.item_id, rel.tag_id, rel.created_at]
      );
    }
    
    console.log('✅ Items table recreated successfully with correct constraint');
    
  } catch (error) {
    console.error('Error recreating items table:', error);
    // Don't throw - let the app continue
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
