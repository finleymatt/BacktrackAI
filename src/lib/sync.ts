import { supabase } from './supabase';
import { getDatabase } from '../data/db';
import { TABLES, Folder, Tag, Item, ItemFolder, ItemTag } from '../data/models';
import { ItemsRepository } from '../data/repositories/items';
import { FoldersRepository } from '../data/repositories/folders';
import { TagsRepository } from '../data/repositories/tags';

export interface SyncResult {
  success: boolean;
  itemsSynced: number;
  foldersSynced: number;
  tagsSynced: number;
  errors: string[];
}

export class SyncService {
  // Get current authenticated user
  private static async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error('User not authenticated');
    }
    return user;
  }

  // Sync all local data to Supabase
  static async syncAll(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      itemsSynced: 0,
      foldersSynced: 0,
      tagsSynced: 0,
      errors: []
    };

    try {
      const user = await this.getCurrentUser();
      console.log('Syncing data for user:', user.id);

      // Sync folders first (items might reference them)
      result.foldersSynced = await this.syncFolders(user.id);
      
      // Sync tags
      result.tagsSynced = await this.syncTags(user.id);
      
      // Sync items last (they might reference folders and tags)
      result.itemsSynced = await this.syncItems(user.id);
      
      // Sync junction tables
      await this.syncItemFolders(user.id);
      await this.syncItemTags(user.id);

      console.log('Sync completed successfully:', result);
    } catch (error) {
      console.error('Sync failed:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  // Sync folders to Supabase
  private static async syncFolders(userId: string): Promise<number> {
    const db = await getDatabase();
    const localFolders = await db.getAllAsync<Folder>(
      `SELECT * FROM ${TABLES.FOLDERS} ORDER BY created_at ASC`
    );

    let syncedCount = 0;
    for (const folder of localFolders) {
      try {
        const { error } = await supabase
          .from('folders')
          .upsert({
            id: folder.id,
            user_id: userId,
            name: folder.name,
            description: folder.description,
            color: folder.color,
            created_at: folder.created_at,
            updated_at: folder.updated_at
          }, {
            onConflict: 'id'
          });

        if (error) {
          console.error('Failed to sync folder:', folder.id, error);
          throw error;
        }

        syncedCount++;
      } catch (error) {
        console.error('Error syncing folder:', folder.id, error);
        throw error;
      }
    }

    return syncedCount;
  }

  // Sync tags to Supabase
  private static async syncTags(userId: string): Promise<number> {
    const db = await getDatabase();
    const localTags = await db.getAllAsync<Tag>(
      `SELECT * FROM ${TABLES.TAGS} ORDER BY created_at ASC`
    );

    let syncedCount = 0;
    for (const tag of localTags) {
      try {
        const { error } = await supabase
          .from('tags')
          .upsert({
            id: tag.id,
            user_id: userId,
            name: tag.name,
            color: tag.color,
            created_at: tag.created_at,
            updated_at: tag.updated_at
          }, {
            onConflict: 'id'
          });

        if (error) {
          console.error('Failed to sync tag:', tag.id, error);
          throw error;
        }

        syncedCount++;
      } catch (error) {
        console.error('Error syncing tag:', tag.id, error);
        throw error;
      }
    }

    return syncedCount;
  }

  // Sync items to Supabase
  private static async syncItems(userId: string): Promise<number> {
    const db = await getDatabase();
    const localItems = await db.getAllAsync<Item>(
      `SELECT * FROM ${TABLES.ITEMS} ORDER BY created_at ASC`
    );

    let syncedCount = 0;
    for (const item of localItems) {
      try {
        const { error } = await supabase
          .from('items')
          .upsert({
            id: item.id,
            user_id: userId,
            title: item.title,
            description: item.description,
            content_url: item.content_url,
            thumbnail_url: item.thumbnail_url,
            source: item.source,
            platform: item.platform,
            items_embedding: null, // Will be populated later for semantic search
            created_at: item.created_at,
            ingested_at: item.ingested_at,
            updated_at: item.updated_at
          }, {
            onConflict: 'id'
          });

        if (error) {
          console.error('Failed to sync item:', item.id, error);
          throw error;
        }

        syncedCount++;
      } catch (error) {
        console.error('Error syncing item:', item.id, error);
        throw error;
      }
    }

    return syncedCount;
  }

  // Sync item-folder relationships
  private static async syncItemFolders(userId: string): Promise<void> {
    const db = await getDatabase();
    const localItemFolders = await db.getAllAsync<ItemFolder>(
      `SELECT * FROM ${TABLES.ITEM_FOLDERS} ORDER BY created_at ASC`
    );

    for (const itemFolder of localItemFolders) {
      try {
        const { error } = await supabase
          .from('item_folders')
          .upsert({
            item_id: itemFolder.item_id,
            folder_id: itemFolder.folder_id,
            created_at: itemFolder.created_at
          }, {
            onConflict: 'item_id,folder_id'
          });

        if (error) {
          console.error('Failed to sync item-folder relationship:', itemFolder, error);
          throw error;
        }
      } catch (error) {
        console.error('Error syncing item-folder relationship:', itemFolder, error);
        throw error;
      }
    }
  }

  // Sync item-tag relationships
  private static async syncItemTags(userId: string): Promise<void> {
    const db = await getDatabase();
    const localItemTags = await db.getAllAsync<ItemTag>(
      `SELECT * FROM ${TABLES.ITEM_TAGS} ORDER BY created_at ASC`
    );

    for (const itemTag of localItemTags) {
      try {
        const { error } = await supabase
          .from('item_tags')
          .upsert({
            item_id: itemTag.item_id,
            tag_id: itemTag.tag_id,
            created_at: itemTag.created_at
          }, {
            onConflict: 'item_id,tag_id'
          });

        if (error) {
          console.error('Failed to sync item-tag relationship:', itemTag, error);
          throw error;
        }
      } catch (error) {
        console.error('Error syncing item-tag relationship:', itemTag, error);
        throw error;
      }
    }
  }

  // Pull data from Supabase to local (for future use)
  static async pullFromCloud(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      itemsSynced: 0,
      foldersSynced: 0,
      tagsSynced: 0,
      errors: []
    };

    try {
      const user = await this.getCurrentUser();
      console.log('Pulling data for user:', user.id);

      // This would implement pulling data from Supabase to local
      // For now, we'll just log that it's not implemented
      console.log('Pull from cloud not implemented yet');

    } catch (error) {
      console.error('Pull failed:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
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
  static async getSyncStatus(): Promise<{
    isAuthenticated: boolean;
    lastSync?: string;
    localCounts: {
      items: number;
      folders: number;
      tags: number;
    };
  }> {
    const isAuthenticated = await this.isAuthenticated();
    
    const db = await getDatabase();
    const [itemsCount, foldersCount, tagsCount] = await Promise.all([
      ItemsRepository.getCount(),
      FoldersRepository.getCount(),
      TagsRepository.getCount()
    ]);

    return {
      isAuthenticated,
      localCounts: {
        items: itemsCount,
        folders: foldersCount,
        tags: tagsCount
      }
    };
  }
}
