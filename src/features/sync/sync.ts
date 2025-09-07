import { supabase } from '../../lib/supabase';
import { getDatabase } from '../../data/db';
import { TABLES, Folder, Tag, Item, ItemFolder, ItemTag, Source, Platform } from '../../data/models';
import { ItemsRepository } from '../../data/repositories/items';
import { FoldersRepository } from '../../data/repositories/folders';
import { TagsRepository } from '../../data/repositories/tags';

// Sync metadata for tracking sync state
export interface SyncMetadata {
  id: string;
  table_name: string;
  record_id: string;
  last_synced_at: string;
  is_dirty: boolean;
  created_at: string;
  updated_at: string;
}

// Conflict resolution result
export interface ConflictResolution {
  action: 'local_wins' | 'remote_wins' | 'merged';
  localData: any;
  remoteData: any;
  resolvedData: any;
  conflictReason: string;
}

// Sync result with detailed information
export interface SyncResult {
  success: boolean;
  itemsSynced: number;
  foldersSynced: number;
  tagsSynced: number;
  conflictsResolved: number;
  errors: string[];
  lastSyncAt?: string;
  syncMetadata: {
    pushed: number;
    pulled: number;
    conflicts: number;
  };
}

// Sync status information
export interface SyncStatus {
  isAuthenticated: boolean;
  lastSyncAt?: string;
  localCounts: {
    items: number;
    folders: number;
    tags: number;
  };
  pendingChanges: {
    items: number;
    folders: number;
    tags: number;
  };
  isOnline: boolean;
}

export class SyncService {
  private static readonly SYNC_METADATA_TABLE = 'sync_metadata';
  private static readonly CONFLICT_LOG_TABLE = 'sync_conflicts';

  // Initialize sync metadata table
  private static async initSyncTables(): Promise<void> {
    const db = await getDatabase();
    
    // Create sync metadata table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS ${this.SYNC_METADATA_TABLE} (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        last_synced_at TEXT,
        is_dirty BOOLEAN NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(table_name, record_id)
      );
    `);

    // Create conflict log table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS ${this.CONFLICT_LOG_TABLE} (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        conflict_type TEXT NOT NULL,
        local_data TEXT NOT NULL,
        remote_data TEXT NOT NULL,
        resolution TEXT NOT NULL,
        resolved_data TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Create indexes
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_sync_metadata_table_record ON ${this.SYNC_METADATA_TABLE} (table_name, record_id);`);
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_sync_metadata_dirty ON ${this.SYNC_METADATA_TABLE} (is_dirty);`);
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_sync_conflicts_table_record ON ${this.CONFLICT_LOG_TABLE} (table_name, record_id);`);
  }

  // Get current authenticated user
  private static async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error('User not authenticated');
    }
    
    // Ensure user exists in users table
    await this.ensureUserExists(user);
    
    return user;
  }

  // Ensure user exists in users table
  private static async ensureUserExists(authUser: any): Promise<void> {
    try {
      // Check if user exists in users table
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('id', authUser.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
        throw fetchError;
      }

      // If user doesn't exist, create them
      if (!existingUser) {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email,
            name: authUser.user_metadata?.name || 'User',
            created_at: authUser.created_at,
            updated_at: authUser.updated_at
          });

        if (insertError) {
          console.error('Failed to create user record:', insertError);
          throw insertError;
        }
        
        console.log('Created user record for:', authUser.email);
      }
    } catch (error) {
      console.error('Error ensuring user exists:', error);
      throw error;
    }
  }

  // Mark record as dirty (needs sync)
  private static async markDirty(tableName: string, recordId: string): Promise<void> {
    const db = await getDatabase();
    await this.initSyncTables();
    
    await db.runAsync(`
      INSERT OR REPLACE INTO ${this.SYNC_METADATA_TABLE} 
      (id, table_name, record_id, is_dirty, updated_at)
      VALUES (?, ?, ?, 1, datetime('now'))
    `, [`${tableName}_${recordId}`, tableName, recordId]);
  }

  // Mark record as synced
  private static async markSynced(tableName: string, recordId: string): Promise<void> {
    const db = await getDatabase();
    await this.initSyncTables();
    
    await db.runAsync(`
      INSERT OR REPLACE INTO ${this.SYNC_METADATA_TABLE} 
      (id, table_name, record_id, last_synced_at, is_dirty, updated_at)
      VALUES (?, ?, ?, datetime('now'), 0, datetime('now'))
    `, [`${tableName}_${recordId}`, tableName, recordId]);
  }

  // Get dirty records for a table
  private static async getDirtyRecords(tableName: string): Promise<string[]> {
    const db = await getDatabase();
    await this.initSyncTables();
    
    const records = await db.getAllAsync<{ record_id: string }>(`
      SELECT record_id FROM ${this.SYNC_METADATA_TABLE} 
      WHERE table_name = ? AND is_dirty = 1
    `, [tableName]);
    
    return records.map(r => r.record_id);
  }

  // Log conflict for audit trail
  private static async logConflict(
    tableName: string, 
    recordId: string, 
    conflictType: string,
    localData: any, 
    remoteData: any, 
    resolution: string,
    resolvedData?: any
  ): Promise<void> {
    const db = await getDatabase();
    await this.initSyncTables();
    
    await db.runAsync(`
      INSERT INTO ${this.CONFLICT_LOG_TABLE} 
      (id, table_name, record_id, conflict_type, local_data, remote_data, resolution, resolved_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      `${tableName}_${recordId}_${Date.now()}`,
      tableName,
      recordId,
      conflictType,
      JSON.stringify(localData),
      JSON.stringify(remoteData),
      resolution,
      resolvedData ? JSON.stringify(resolvedData) : null
    ]);
  }

  // Resolve conflict using last-write-wins strategy
  private static resolveConflict(localData: any, remoteData: any, tableName: string): ConflictResolution {
    const localUpdated = new Date(localData.updated_at);
    const remoteUpdated = new Date(remoteData.updated_at);
    
    if (localUpdated > remoteUpdated) {
      return {
        action: 'local_wins',
        localData,
        remoteData,
        resolvedData: localData,
        conflictReason: `Local data is newer (${localUpdated.toISOString()} vs ${remoteUpdated.toISOString()})`
      };
    } else if (remoteUpdated > localUpdated) {
      return {
        action: 'remote_wins',
        localData,
        remoteData,
        resolvedData: remoteData,
        conflictReason: `Remote data is newer (${remoteUpdated.toISOString()} vs ${localUpdated.toISOString()})`
      };
    } else {
      // Same timestamp, prefer local (user's current state)
      return {
        action: 'local_wins',
        localData,
        remoteData,
        resolvedData: localData,
        conflictReason: 'Same timestamp, preferring local data'
      };
    }
  }

  // Full sync: push dirty data and pull remote changes
  static async syncAll(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      itemsSynced: 0,
      foldersSynced: 0,
      tagsSynced: 0,
      conflictsResolved: 0,
      errors: [],
      syncMetadata: {
        pushed: 0,
        pulled: 0,
        conflicts: 0
      }
    };

    try {
      await this.initSyncTables();
      const user = await this.getCurrentUser();
      console.log('Starting full sync for user:', user.id);

      // Push dirty local changes first
      const pushResult = await this.pushDirtyChanges(user.id);
      result.syncMetadata.pushed = pushResult.pushed;
      result.conflictsResolved += pushResult.conflicts;

      // Pull remote changes
      const pullResult = await this.pullRemoteChanges(user.id);
      result.syncMetadata.pulled = pullResult.pulled;
      result.conflictsResolved += pullResult.conflicts;

      // Update counts
      result.itemsSynced = pushResult.itemsSynced + pullResult.itemsSynced;
      result.foldersSynced = pushResult.foldersSynced + pullResult.foldersSynced;
      result.tagsSynced = pushResult.tagsSynced + pullResult.tagsSynced;

      result.lastSyncAt = new Date().toISOString();
      console.log('Sync completed successfully:', result);
    } catch (error) {
      console.error('Sync failed:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  // Push dirty local changes to cloud
  private static async pushDirtyChanges(userId: string): Promise<{
    pushed: number;
    conflicts: number;
    itemsSynced: number;
    foldersSynced: number;
    tagsSynced: number;
  }> {
    const result = {
      pushed: 0,
      conflicts: 0,
      itemsSynced: 0,
      foldersSynced: 0,
      tagsSynced: 0
    };

    // Push folders
    const dirtyFolders = await this.getDirtyRecords(TABLES.FOLDERS);
    for (const folderId of dirtyFolders) {
      try {
        const folder = await FoldersRepository.getById(folderId);
        if (folder) {
          const pushResult = await this.pushFolder(folder, userId);
          result.pushed += pushResult.pushed;
          result.conflicts += pushResult.conflicts;
          if (pushResult.success) {
            result.foldersSynced++;
            await this.markSynced(TABLES.FOLDERS, folderId);
          }
        }
      } catch (error) {
        console.error('Error pushing folder:', folderId, error);
      }
    }

    // Push tags
    const dirtyTags = await this.getDirtyRecords(TABLES.TAGS);
    for (const tagId of dirtyTags) {
      try {
        const tag = await TagsRepository.getById(tagId);
        if (tag) {
          const pushResult = await this.pushTag(tag, userId);
          result.pushed += pushResult.pushed;
          result.conflicts += pushResult.conflicts;
          if (pushResult.success) {
            result.tagsSynced++;
            await this.markSynced(TABLES.TAGS, tagId);
          }
        }
      } catch (error) {
        console.error('Error pushing tag:', tagId, error);
      }
    }

    // Push items
    const dirtyItems = await this.getDirtyRecords(TABLES.ITEMS);
    for (const itemId of dirtyItems) {
      try {
        const item = await ItemsRepository.getById(itemId);
        if (item) {
          const pushResult = await this.pushItem(item, userId);
          result.pushed += pushResult.pushed;
          result.conflicts += pushResult.conflicts;
          if (pushResult.success) {
            result.itemsSynced++;
            await this.markSynced(TABLES.ITEMS, itemId);
          }
        }
      } catch (error) {
        console.error('Error pushing item:', itemId, error);
      }
    }

    return result;
  }

  // Push single folder to cloud
  private static async pushFolder(folder: Folder, userId: string): Promise<{
    success: boolean;
    pushed: number;
    conflicts: number;
  }> {
    try {
      // Check if folder exists remotely
      const { data: existingFolder, error: fetchError } = await supabase
        .from('folders')
        .select('*')
        .eq('id', folder.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
        throw fetchError;
      }

      let conflictResolved = false;
      let dataToUpsert = {
        id: folder.id,
        user_id: userId,
        name: folder.name,
        description: folder.description,
        color: folder.color,
        is_public: folder.is_public,
        created_at: folder.created_at,
        updated_at: folder.updated_at
      };

      // Handle conflict if folder exists remotely
      if (existingFolder) {
        const conflict = this.resolveConflict(folder, existingFolder, TABLES.FOLDERS);
        if (conflict.action === 'remote_wins') {
          // Update local with remote data
          await FoldersRepository.update(folder.id, existingFolder);
          await this.logConflict(TABLES.FOLDERS, folder.id, 'update_conflict', folder, existingFolder, 'remote_wins', existingFolder);
          conflictResolved = true;
        } else {
          // Use local data (local_wins)
          await this.logConflict(TABLES.FOLDERS, folder.id, 'update_conflict', folder, existingFolder, 'local_wins', dataToUpsert);
          conflictResolved = true;
        }
      }

      // Upsert to cloud
      const { error } = await supabase
        .from('folders')
        .upsert(dataToUpsert, { onConflict: 'id' });

      if (error) {
        // If it's a unique constraint violation, log it and continue
        if (error.code === '23505') {
          console.log(`Skipping folder ${folder.id} due to unique constraint violation: ${error.message}`);
          await this.logConflict(TABLES.FOLDERS, folder.id, 'unique_constraint_violation', folder, null, 'skipped', null);
          return {
            success: true,
            pushed: 0,
            conflicts: 1
          };
        }
        throw error;
      }

      return {
        success: true,
        pushed: 1,
        conflicts: conflictResolved ? 1 : 0
      };
    } catch (error) {
      console.error('Error pushing folder:', folder.id, error);
      return {
        success: false,
        pushed: 0,
        conflicts: 0
      };
    }
  }

  // Push single tag to cloud
  private static async pushTag(tag: Tag, userId: string): Promise<{
    success: boolean;
    pushed: number;
    conflicts: number;
  }> {
    try {
      // Check if tag exists remotely by ID first
      const { data: existingTagById, error: fetchByIdError } = await supabase
        .from('tags')
        .select('*')
        .eq('id', tag.id)
        .single();

      if (fetchByIdError && fetchByIdError.code !== 'PGRST116') {
        throw fetchByIdError;
      }

      // Check if tag exists remotely by name (for unique constraint)
      const { data: existingTagByName, error: fetchByNameError } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', userId)
        .eq('name', tag.name)
        .single();

      if (fetchByNameError && fetchByNameError.code !== 'PGRST116') {
        throw fetchByNameError;
      }

      let conflictResolved = false;
      let dataToUpsert = {
        id: tag.id,
        user_id: userId,
        name: tag.name,
        color: tag.color,
        created_at: tag.created_at,
        updated_at: tag.updated_at
      };

      // Handle different conflict scenarios
      if (existingTagById) {
        // Tag exists with same ID
        const conflict = this.resolveConflict(tag, existingTagById, TABLES.TAGS);
        if (conflict.action === 'remote_wins') {
          // Update local with remote data
          await TagsRepository.update(tag.id, existingTagById);
          await this.logConflict(TABLES.TAGS, tag.id, 'update_conflict', tag, existingTagById, 'remote_wins', existingTagById);
          conflictResolved = true;
        } else {
          // Use local data (local_wins)
          await this.logConflict(TABLES.TAGS, tag.id, 'update_conflict', tag, existingTagById, 'local_wins', dataToUpsert);
          conflictResolved = true;
        }
      } else if (existingTagByName && existingTagByName.id !== tag.id) {
        // Tag exists with same name but different ID - this is a name conflict
        console.log(`Tag name conflict: local tag ${tag.id} has same name as remote tag ${existingTagByName.id}`);
        
        // For now, we'll skip this tag to avoid the unique constraint violation
        // In a more sophisticated system, we might rename the local tag
        await this.logConflict(TABLES.TAGS, tag.id, 'name_conflict', tag, existingTagByName, 'skipped', null);
        
        return {
          success: true,
          pushed: 0,
          conflicts: 1
        };
      }

      // Upsert to cloud
      const { error } = await supabase
        .from('tags')
        .upsert(dataToUpsert, { onConflict: 'id' });

      if (error) {
        // If it's a unique constraint violation, log it and continue
        if (error.code === '23505') {
          console.log(`Skipping tag ${tag.id} due to unique constraint violation: ${error.message}`);
          await this.logConflict(TABLES.TAGS, tag.id, 'unique_constraint_violation', tag, null, 'skipped', null);
          return {
            success: true,
            pushed: 0,
            conflicts: 1
          };
        }
        throw error;
      }

      return {
        success: true,
        pushed: 1,
        conflicts: conflictResolved ? 1 : 0
      };
    } catch (error) {
      console.error('Error pushing tag:', tag.id, error);
      return {
        success: false,
        pushed: 0,
        conflicts: 0
      };
    }
  }

  // Push single item to cloud
  private static async pushItem(item: Item, userId: string): Promise<{
    success: boolean;
    pushed: number;
    conflicts: number;
  }> {
    try {
      // Check if item exists remotely
      const { data: existingItem, error: fetchError } = await supabase
        .from('items')
        .select('*')
        .eq('id', item.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      let conflictResolved = false;
      
      // Start with basic fields that should always exist
      let dataToUpsert: any = {
        id: item.id,
        user_id: userId,
        title: item.title,
        description: item.description,
        content_url: item.content_url,
        thumbnail_url: item.thumbnail_url,
        source: item.source,
        platform: item.platform,
        created_at: item.created_at,
        ingested_at: item.ingested_at,
        updated_at: item.updated_at
      };

      // Add optional fields if they exist (for backward compatibility)
      if (item.source_date !== undefined) dataToUpsert.source_date = item.source_date;
      if (item.ocr_text !== undefined) dataToUpsert.ocr_text = item.ocr_text;
      if (item.ocr_done !== undefined) dataToUpsert.ocr_done = item.ocr_done;
      if (item.ocr_status !== undefined) dataToUpsert.ocr_status = item.ocr_status;

      // Handle conflict if item exists remotely
      if (existingItem) {
        const conflict = this.resolveConflict(item, existingItem, TABLES.ITEMS);
        if (conflict.action === 'remote_wins') {
          // Update local with remote data
          await ItemsRepository.update(item.id, existingItem);
          await this.logConflict(TABLES.ITEMS, item.id, 'update_conflict', item, existingItem, 'remote_wins', existingItem);
          conflictResolved = true;
        } else {
          // Use local data (local_wins)
          await this.logConflict(TABLES.ITEMS, item.id, 'update_conflict', item, existingItem, 'local_wins', dataToUpsert);
          conflictResolved = true;
        }
      }

      // Upsert to cloud
      const { error } = await supabase
        .from('items')
        .upsert(dataToUpsert, { onConflict: 'id' });

      if (error) throw error;

      return {
        success: true,
        pushed: 1,
        conflicts: conflictResolved ? 1 : 0
      };
    } catch (error) {
      console.error('Error pushing item:', item.id, error);
      return {
        success: false,
        pushed: 0,
        conflicts: 0
      };
    }
  }

  // Pull remote changes from cloud
  private static async pullRemoteChanges(userId: string): Promise<{
    pulled: number;
    conflicts: number;
    itemsSynced: number;
    foldersSynced: number;
    tagsSynced: number;
  }> {
    const result = {
      pulled: 0,
      conflicts: 0,
      itemsSynced: 0,
      foldersSynced: 0,
      tagsSynced: 0
    };

    try {
      // Get last sync time for this user (we'll use a simple approach for now)
      const lastSync = await this.getLastSyncTime();

      // Pull folders
      const { data: remoteFolders, error: foldersError } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', userId)
        .gt('updated_at', lastSync);

      if (foldersError) throw foldersError;

      for (const remoteFolder of remoteFolders || []) {
        const pullResult = await this.pullFolder(remoteFolder);
        result.pulled += pullResult.pulled;
        result.conflicts += pullResult.conflicts;
        if (pullResult.success) {
          result.foldersSynced++;
        }
      }

      // Pull tags
      const { data: remoteTags, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', userId)
        .gt('updated_at', lastSync);

      if (tagsError) throw tagsError;

      for (const remoteTag of remoteTags || []) {
        const pullResult = await this.pullTag(remoteTag);
        result.pulled += pullResult.pulled;
        result.conflicts += pullResult.conflicts;
        if (pullResult.success) {
          result.tagsSynced++;
        }
      }

      // Pull items
      const { data: remoteItems, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', userId)
        .gt('updated_at', lastSync);

      if (itemsError) throw itemsError;

      for (const remoteItem of remoteItems || []) {
        const pullResult = await this.pullItem(remoteItem);
        result.pulled += pullResult.pulled;
        result.conflicts += pullResult.conflicts;
        if (pullResult.success) {
          result.itemsSynced++;
        }
      }

    } catch (error) {
      console.error('Error pulling remote changes:', error);
    }

    return result;
  }

  // Pull single folder from cloud
  private static async pullFolder(remoteFolder: any): Promise<{
    success: boolean;
    pulled: number;
    conflicts: number;
  }> {
    try {
      const localFolder = await FoldersRepository.getById(remoteFolder.id);
      
      if (!localFolder) {
        // New folder, create locally
        await FoldersRepository.create(remoteFolder);
        await this.markSynced(TABLES.FOLDERS, remoteFolder.id);
        return { success: true, pulled: 1, conflicts: 0 };
      }

      // Check for conflicts
      const localUpdated = new Date(localFolder.updated_at);
      const remoteUpdated = new Date(remoteFolder.updated_at);

      if (remoteUpdated > localUpdated) {
        // Remote is newer, update local
        await FoldersRepository.update(remoteFolder.id, remoteFolder);
        await this.markSynced(TABLES.FOLDERS, remoteFolder.id);
        return { success: true, pulled: 1, conflicts: 0 };
      } else if (localUpdated > remoteUpdated) {
        // Local is newer, this will be handled in push phase
        return { success: true, pulled: 0, conflicts: 0 };
      } else {
        // Same timestamp, no conflict
        await this.markSynced(TABLES.FOLDERS, remoteFolder.id);
        return { success: true, pulled: 0, conflicts: 0 };
      }
    } catch (error) {
      console.error('Error pulling folder:', remoteFolder.id, error);
      return { success: false, pulled: 0, conflicts: 0 };
    }
  }

  // Pull single tag from cloud
  private static async pullTag(remoteTag: any): Promise<{
    success: boolean;
    pulled: number;
    conflicts: number;
  }> {
    try {
      const localTag = await TagsRepository.getById(remoteTag.id);
      
      if (!localTag) {
        // New tag, create locally
        await TagsRepository.create(remoteTag);
        await this.markSynced(TABLES.TAGS, remoteTag.id);
        return { success: true, pulled: 1, conflicts: 0 };
      }

      // Check for conflicts
      const localUpdated = new Date(localTag.updated_at);
      const remoteUpdated = new Date(remoteTag.updated_at);

      if (remoteUpdated > localUpdated) {
        // Remote is newer, update local
        await TagsRepository.update(remoteTag.id, remoteTag);
        await this.markSynced(TABLES.TAGS, remoteTag.id);
        return { success: true, pulled: 1, conflicts: 0 };
      } else if (localUpdated > remoteUpdated) {
        // Local is newer, this will be handled in push phase
        return { success: true, pulled: 0, conflicts: 0 };
      } else {
        // Same timestamp, no conflict
        await this.markSynced(TABLES.TAGS, remoteTag.id);
        return { success: true, pulled: 0, conflicts: 0 };
      }
    } catch (error) {
      console.error('Error pulling tag:', remoteTag.id, error);
      return { success: false, pulled: 0, conflicts: 0 };
    }
  }

  // Pull single item from cloud
  private static async pullItem(remoteItem: any): Promise<{
    success: boolean;
    pulled: number;
    conflicts: number;
  }> {
    try {
      const localItem = await ItemsRepository.getById(remoteItem.id);
      
      if (!localItem) {
        // New item, create locally
        await ItemsRepository.create(remoteItem);
        await this.markSynced(TABLES.ITEMS, remoteItem.id);
        return { success: true, pulled: 1, conflicts: 0 };
      }

      // Check for conflicts
      const localUpdated = new Date(localItem.updated_at);
      const remoteUpdated = new Date(remoteItem.updated_at);

      if (remoteUpdated > localUpdated) {
        // Remote is newer, update local
        await ItemsRepository.update(remoteItem.id, remoteItem);
        await this.markSynced(TABLES.ITEMS, remoteItem.id);
        return { success: true, pulled: 1, conflicts: 0 };
      } else if (localUpdated > remoteUpdated) {
        // Local is newer, this will be handled in push phase
        return { success: true, pulled: 0, conflicts: 0 };
      } else {
        // Same timestamp, no conflict
        await this.markSynced(TABLES.ITEMS, remoteItem.id);
        return { success: true, pulled: 0, conflicts: 0 };
      }
    } catch (error) {
      console.error('Error pulling item:', remoteItem.id, error);
      return { success: false, pulled: 0, conflicts: 0 };
    }
  }

  // Get last sync time (simple implementation)
  private static async getLastSyncTime(): Promise<string> {
    const db = await getDatabase();
    await this.initSyncTables();
    
    const result = await db.getFirstAsync<{ last_synced_at: string }>(`
      SELECT MAX(last_synced_at) as last_synced_at 
      FROM ${this.SYNC_METADATA_TABLE} 
      WHERE last_synced_at IS NOT NULL
    `);
    
    return result?.last_synced_at || '1970-01-01T00:00:00.000Z';
  }

  // Check if user is authenticated
  static async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      return !error && !!user;
    } catch {
      return false;
    }
  }

  // Get sync status
  static async getSyncStatus(): Promise<SyncStatus> {
    const isAuthenticated = await this.isAuthenticated();
    
    const db = await getDatabase();
    await this.initSyncTables();
    
    const [itemsCount, foldersCount, tagsCount] = await Promise.all([
      ItemsRepository.getCount(),
      FoldersRepository.getCount(),
      TagsRepository.getCount()
    ]);

    // Get pending changes count
    const [pendingItems, pendingFolders, pendingTags] = await Promise.all([
      this.getDirtyRecords(TABLES.ITEMS),
      this.getDirtyRecords(TABLES.FOLDERS),
      this.getDirtyRecords(TABLES.TAGS)
    ]);

    const lastSyncAt = await this.getLastSyncTime();

    return {
      isAuthenticated,
      lastSyncAt: lastSyncAt !== '1970-01-01T00:00:00.000Z' ? lastSyncAt : undefined,
      localCounts: {
        items: itemsCount,
        folders: foldersCount,
        tags: tagsCount
      },
      pendingChanges: {
        items: pendingItems.length,
        folders: pendingFolders.length,
        tags: pendingTags.length
      },
      isOnline: true // TODO: Implement proper network detection
    };
  }

  // Mark item as dirty (call this when items are created/updated)
  static async markItemDirty(itemId: string): Promise<void> {
    await this.markDirty(TABLES.ITEMS, itemId);
  }

  // Mark folder as dirty (call this when folders are created/updated)
  static async markFolderDirty(folderId: string): Promise<void> {
    await this.markDirty(TABLES.FOLDERS, folderId);
  }

  // Mark tag as dirty (call this when tags are created/updated)
  static async markTagDirty(tagId: string): Promise<void> {
    await this.markDirty(TABLES.TAGS, tagId);
  }

  // Get conflict history for debugging
  static async getConflictHistory(): Promise<any[]> {
    const db = await getDatabase();
    await this.initSyncTables();
    
    return await db.getAllAsync(`
      SELECT * FROM ${this.CONFLICT_LOG_TABLE} 
      ORDER BY created_at DESC 
      LIMIT 50
    `);
  }
}
