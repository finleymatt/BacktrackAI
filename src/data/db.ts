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
    
    // Force ensure is_public column exists in folders table (critical for folder feature)
    await forceEnsureIsPublicColumn(db);
    
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

// Close database connection (for cleanup)
export const closeDatabase = async (): Promise<void> => {
  if (db) {
    try {
      await db.closeAsync();
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error closing database:', error);
    } finally {
      db = null;
    }
  }
};

// Reset database connection (useful for fixing locking issues)
export const resetDatabaseConnection = async (): Promise<SQLite.SQLiteDatabase> => {
  await closeDatabase();
  return await initDatabase();
};

// Force reset database (nuclear option for persistent locking issues)
export const forceResetDatabase = async (): Promise<void> => {
  try {
    console.log('🔄 Force resetting database...');
    await closeDatabase();
    
    // Delete the database file completely
    const { deleteAsync, documentDirectory } = await import('expo-file-system');
    const dbPath = `${documentDirectory}SQLite/backtrack.db`;
    
    try {
      await deleteAsync(dbPath);
      console.log('✅ Database file deleted');
    } catch (error) {
      console.warn('Could not delete database file:', error);
    }
    
    // Reinitialize
    await initDatabase();
    console.log('✅ Database force reset complete');
  } catch (error) {
    console.error('❌ Force reset failed:', error);
    throw error;
  }
};

// Fix screenshot constraint (dedicated function for this specific issue)
export const fixScreenshotConstraint = async (): Promise<void> => {
  try {
    console.log('🔧 Fixing screenshot constraint...');
    const database = await getDatabase();
    
    // First, check what columns currently exist
    const tableInfo = await database.getAllAsync(`PRAGMA table_info(${TABLES.ITEMS});`);
    const existingColumns = tableInfo.map((col: any) => col.name);
    console.log('Current table columns:', existingColumns);
    
    // Test if we can insert a screenshot item with all required columns
    try {
      await database.runAsync(
        `INSERT INTO ${TABLES.ITEMS} (id, title, source, platform, source_date, ocr_done, ocr_status, created_at, ingested_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'test-screenshot-constraint', 
          'Test Screenshot', 
          'screenshot', 
          'generic', 
          new Date().toISOString(),
          1, 
          'pending',
          new Date().toISOString(), 
          new Date().toISOString(), 
          new Date().toISOString()
        ]
      );
      
      // If successful, clean up and return
      await database.runAsync(`DELETE FROM ${TABLES.ITEMS} WHERE id = ?`, ['test-screenshot-constraint']);
      console.log('✅ Screenshot constraint is already working');
      return;
    } catch (error) {
      console.log('❌ Screenshot constraint needs fixing, recreating table...');
      console.log('Error details:', error);
    }
    
    // Get all existing data
    const existingItems = await database.getAllAsync(`SELECT * FROM ${TABLES.ITEMS}`);
    const existingItemFolders = await database.getAllAsync(`SELECT * FROM ${TABLES.ITEM_FOLDERS}`);
    const existingItemTags = await database.getAllAsync(`SELECT * FROM ${TABLES.ITEM_TAGS}`);
    
    console.log(`Backing up ${existingItems.length} items, ${existingItemFolders.length} item-folder relationships, ${existingItemTags.length} item-tag relationships`);
    
    // Drop the old table
    await database.execAsync(`DROP TABLE IF EXISTS ${TABLES.ITEMS}`);
    
    // Create the new table with updated constraint
    await database.execAsync(`
      CREATE TABLE ${TABLES.ITEMS} (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        content_url TEXT,
        thumbnail_url TEXT,
        source TEXT NOT NULL CHECK (source IN ('shared_url', 'photo_scan', 'url', 'screenshot')),
        platform TEXT,
        source_date TEXT,
        ocr_text TEXT,
        ocr_done BOOLEAN NOT NULL DEFAULT 0,
        ocr_status TEXT CHECK (ocr_status IN ('pending', 'done', 'error')),
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
    await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_items_ocr_status ON ${TABLES.ITEMS} (ocr_status);`);
    await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_items_source_date ON ${TABLES.ITEMS} (source_date);`);
    
    // Restore the data
    for (const item of existingItems) {
      await database.runAsync(
        `INSERT INTO ${TABLES.ITEMS} (id, title, description, content_url, thumbnail_url, source, platform, source_date, ocr_text, ocr_done, ocr_status, created_at, ingested_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          (item as any).id,
          (item as any).title,
          (item as any).description || null,
          (item as any).content_url || null,
          (item as any).thumbnail_url || null,
          (item as any).source,
          (item as any).platform || null,
          (item as any).source_date || null,
          (item as any).ocr_text || null,
          (item as any).ocr_done ? 1 : 0,
          (item as any).ocr_status || null,
          (item as any).created_at,
          (item as any).ingested_at,
          (item as any).updated_at,
        ]
      );
    }
    
    // Restore relationships
    for (const rel of existingItemFolders) {
      await database.runAsync(
        `INSERT INTO ${TABLES.ITEM_FOLDERS} (item_id, folder_id, created_at)
         VALUES (?, ?, ?)`,
        [(rel as any).item_id, (rel as any).folder_id, (rel as any).created_at]
      );
    }
    
    for (const rel of existingItemTags) {
      await database.runAsync(
        `INSERT INTO ${TABLES.ITEM_TAGS} (item_id, tag_id, created_at)
         VALUES (?, ?, ?)`,
        [(rel as any).item_id, (rel as any).tag_id, (rel as any).created_at]
      );
    }
    
    console.log('✅ Screenshot constraint fixed successfully');
    
    // Verify the fix worked
    const newTableInfo = await database.getAllAsync(`PRAGMA table_info(${TABLES.ITEMS});`);
    const newColumns = newTableInfo.map((col: any) => col.name);
    console.log('New table columns:', newColumns);
    
  } catch (error) {
    console.error('❌ Failed to fix screenshot constraint:', error);
    throw error;
  }
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
    
    // Migration 4: Add is_public field to folders table
    if (currentVersion < 4) {
      await migration4_addIsPublicToFolders(database);
    }
    
    // Migration 5: Add OCR status and source_date fields to items table
    if (currentVersion < 5) {
      await migration5_addOcrStatusAndSourceDate(database);
    }
    
    // Migration 6: Force recreate items table with updated source constraint
    if (currentVersion < 6) {
      await migration6_updateSourceConstraint(database);
    }
    
    // Always ensure platform column exists (safety check)
    await ensurePlatformColumnExists(database);
    
    // Always ensure is_public column exists in folders table (safety check)
    await ensureIsPublicColumnExists(database);
    
    // Force ensure is_public column exists (more aggressive approach)
    await forceEnsureIsPublicColumn(database);
    
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
      source TEXT NOT NULL CHECK (source IN ('shared_url', 'photo_scan', 'url', 'screenshot')),
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
      is_public BOOLEAN NOT NULL DEFAULT 0,
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
    `CREATE INDEX IF NOT EXISTS idx_folders_is_public ON ${TABLES.FOLDERS} (is_public);`,
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

// Migration 4: Add is_public field to folders table
const migration4_addIsPublicToFolders = async (database: SQLite.SQLiteDatabase): Promise<void> => {
  console.log('Running migration 4: Adding is_public field to folders table');
  
  try {
    // Check if is_public column already exists
    const tableInfo = await database.getAllAsync(`PRAGMA table_info(${TABLES.FOLDERS});`);
    const existingColumns = tableInfo.map((col: any) => col.name);
    
    const migrations = [];
    
    // Only add is_public column if it doesn't exist
    if (!existingColumns.includes('is_public')) {
      migrations.push(`ALTER TABLE ${TABLES.FOLDERS} ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT 0;`);
    }
    
    // Create index for is_public field
    migrations.push(`CREATE INDEX IF NOT EXISTS idx_folders_is_public ON ${TABLES.FOLDERS} (is_public);`);

    for (const migration of migrations) {
      await database.execAsync(migration);
    }
    
    console.log('Migration 4 completed: is_public field added to folders table');
  } catch (error) {
    console.error('Migration 4 failed:', error);
    // Don't throw - let the app continue even if migration fails
  }
};

// Migration 5: Add OCR status and source_date fields to items table
const migration5_addOcrStatusAndSourceDate = async (database: SQLite.SQLiteDatabase): Promise<void> => {
  console.log('Running migration 5: Adding ocr_status and source_date fields to items table');
  
  try {
    // Check if new columns already exist
    const tableInfo = await database.getAllAsync(`PRAGMA table_info(${TABLES.ITEMS});`);
    const existingColumns = tableInfo.map((col: any) => col.name);
    
    const migrations = [];
    
    // Add ocr_status column if it doesn't exist
    if (!existingColumns.includes('ocr_status')) {
      migrations.push(`ALTER TABLE ${TABLES.ITEMS} ADD COLUMN ocr_status TEXT CHECK (ocr_status IN ('pending', 'done', 'error'));`);
    }
    
    // Add source_date column if it doesn't exist
    if (!existingColumns.includes('source_date')) {
      migrations.push(`ALTER TABLE ${TABLES.ITEMS} ADD COLUMN source_date TEXT;`);
    }
    
    // Create indexes for new fields
    migrations.push(`CREATE INDEX IF NOT EXISTS idx_items_ocr_status ON ${TABLES.ITEMS} (ocr_status);`);
    migrations.push(`CREATE INDEX IF NOT EXISTS idx_items_source_date ON ${TABLES.ITEMS} (source_date);`);

    for (const migration of migrations) {
      await database.execAsync(migration);
    }
    
    console.log('Migration 5 completed: ocr_status and source_date fields added to items table');
  } catch (error) {
    console.error('Migration 5 failed:', error);
    // Don't throw - let the app continue even if migration fails
  }
};

// Migration 6: Force recreate items table with updated source constraint
const migration6_updateSourceConstraint = async (database: SQLite.SQLiteDatabase): Promise<void> => {
  console.log('Running migration 6: Updating source constraint to include screenshot');
  
  try {
    // Simply call the existing force recreate function
    // This will handle the constraint update properly
    await forceRecreateItemsTableIfNeeded(database);
    console.log('Migration 6 completed: source constraint updated');
  } catch (error) {
    console.error('Migration 6 failed:', error);
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

// Ensure is_public column exists in folders table (safety check)
const ensureIsPublicColumnExists = async (database: SQLite.SQLiteDatabase): Promise<void> => {
  try {
    // Check if folders table exists first
    const tableExists = await database.getFirstAsync(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      [TABLES.FOLDERS]
    );
    
    if (!tableExists) {
      console.log('Folders table does not exist, skipping is_public column check');
      return;
    }
    
    // Check if is_public column exists
    const tableInfo = await database.getAllAsync(`PRAGMA table_info(${TABLES.FOLDERS});`);
    const existingColumns = tableInfo.map((col: any) => col.name);
    
    if (!existingColumns.includes('is_public')) {
      console.log('is_public column missing from folders table, adding it now...');
      await database.execAsync(`ALTER TABLE ${TABLES.FOLDERS} ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT 0;`);
      await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_folders_is_public ON ${TABLES.FOLDERS} (is_public);`);
      console.log('is_public column added successfully to folders table');
    } else {
      console.log('✅ is_public column already exists in folders table');
    }
  } catch (error) {
    console.error('Error ensuring is_public column exists in folders table:', error);
    // Don't throw - let the app continue
  }
};

// Force ensure is_public column exists (more aggressive approach)
const forceEnsureIsPublicColumn = async (database: SQLite.SQLiteDatabase): Promise<void> => {
  try {
    console.log('🔍 Force checking is_public column in folders table...');
    
    // First, check if folders table exists
    const tableExists = await database.getFirstAsync(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      [TABLES.FOLDERS]
    );
    
    if (!tableExists) {
      console.log('⚠️ Folders table does not exist, creating it with is_public column...');
      // Create the folders table with is_public column
      await database.execAsync(`
        CREATE TABLE ${TABLES.FOLDERS} (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          color TEXT,
          is_public BOOLEAN NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);
      await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_folders_name ON ${TABLES.FOLDERS} (name);`);
      await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_folders_is_public ON ${TABLES.FOLDERS} (is_public);`);
      console.log('✅ Folders table created with is_public column');
      return;
    }
    
    // Try to add the is_public column (will fail silently if it already exists)
    try {
      await database.execAsync(`ALTER TABLE ${TABLES.FOLDERS} ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT 0;`);
      console.log('✅ is_public column added successfully to folders table');
    } catch (error) {
      // Column might already exist, which is fine
      console.log('ℹ️ is_public column already exists or error adding it:', error.message);
    }
    
    // Always try to create the index (will fail silently if it already exists)
    try {
      await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_folders_is_public ON ${TABLES.FOLDERS} (is_public);`);
      console.log('✅ is_public index created/verified for folders table');
    } catch (error) {
      console.log('⚠️ Error creating is_public index for folders table:', error.message);
    }
    
    // Verify the column exists
    const tableInfo = await database.getAllAsync(`PRAGMA table_info(${TABLES.FOLDERS});`);
    const existingColumns = tableInfo.map((col: any) => col.name);
    console.log('📋 Current folders table columns:', existingColumns);
    
    if (existingColumns.includes('is_public')) {
      console.log('✅ is_public column confirmed to exist in folders table');
    } else {
      console.error('❌ is_public column still missing from folders table after force check');
      // Try one more time with a different approach
      try {
        console.log('🔄 Attempting to recreate folders table with is_public column...');
        await database.execAsync(`DROP TABLE IF EXISTS ${TABLES.FOLDERS};`);
        await database.execAsync(`
          CREATE TABLE ${TABLES.FOLDERS} (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            color TEXT,
            is_public BOOLEAN NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
        `);
        await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_folders_name ON ${TABLES.FOLDERS} (name);`);
        await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_folders_is_public ON ${TABLES.FOLDERS} (is_public);`);
        console.log('✅ Folders table recreated with is_public column');
      } catch (recreateError) {
        console.error('❌ Failed to recreate folders table:', recreateError);
      }
    }
    
  } catch (error) {
    console.error('❌ Error in force ensure is_public column for folders table:', error);
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
    
    // Add a small delay to allow any pending operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
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
          source TEXT NOT NULL CHECK (source IN ('shared_url', 'photo_scan', 'url', 'screenshot')),
          platform TEXT,
          source_date TEXT,
          ocr_text TEXT,
          ocr_done BOOLEAN NOT NULL DEFAULT 0,
          ocr_status TEXT CHECK (ocr_status IN ('pending', 'done', 'error')),
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
      await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_items_ocr_status ON ${TABLES.ITEMS} (ocr_status);`);
      await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_items_source_date ON ${TABLES.ITEMS} (source_date);`);
      
      console.log('✅ Items table created successfully with correct constraint');
      return;
    }
    
    // Get all existing data
    const existingItems = await database.getAllAsync(`SELECT * FROM ${TABLES.ITEMS}`);
    const existingItemFolders = await database.getAllAsync(`SELECT * FROM ${TABLES.ITEM_FOLDERS}`);
    const existingItemTags = await database.getAllAsync(`SELECT * FROM ${TABLES.ITEM_TAGS}`);
    
    console.log(`Backing up ${existingItems.length} items, ${existingItemFolders.length} item-folder relationships, ${existingItemTags.length} item-tag relationships`);
    
    // Drop the old table
    await database.execAsync(`DROP TABLE IF EXISTS ${TABLES.ITEMS}`);
    
    // Create the new table with correct constraint
    await database.execAsync(`
      CREATE TABLE ${TABLES.ITEMS} (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        content_url TEXT,
        thumbnail_url TEXT,
        source TEXT NOT NULL CHECK (source IN ('shared_url', 'photo_scan', 'url', 'screenshot')),
        platform TEXT,
        source_date TEXT,
        ocr_text TEXT,
        ocr_done BOOLEAN NOT NULL DEFAULT 0,
        ocr_status TEXT CHECK (ocr_status IN ('pending', 'done', 'error')),
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
    await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_items_ocr_status ON ${TABLES.ITEMS} (ocr_status);`);
    await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_items_source_date ON ${TABLES.ITEMS} (source_date);`);
    
    // Restore the data
    for (const item of existingItems) {
      await database.runAsync(
        `INSERT INTO ${TABLES.ITEMS} (id, title, description, content_url, thumbnail_url, source, platform, source_date, ocr_text, ocr_done, ocr_status, created_at, ingested_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.title,
          item.description || null,
          item.content_url || null,
          item.thumbnail_url || null,
          item.source,
          item.platform || null,
          item.source_date || null,
          item.ocr_text || null,
          item.ocr_done ? 1 : 0,
          item.ocr_status || null,
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

// Force reset folders table (for debugging)
export const resetFoldersTable = async (): Promise<void> => {
  const database = await getDatabase();
  try {
    console.log('🔄 Resetting folders table...');
    await database.execAsync(`DROP TABLE IF EXISTS ${TABLES.FOLDERS};`);
    await database.execAsync(`
      CREATE TABLE ${TABLES.FOLDERS} (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT,
        is_public BOOLEAN NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_folders_name ON ${TABLES.FOLDERS} (name);`);
    await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_folders_is_public ON ${TABLES.FOLDERS} (is_public);`);
    console.log('✅ Folders table reset successfully');
  } catch (error) {
    console.error('❌ Failed to reset folders table:', error);
    throw error;
  }
};
