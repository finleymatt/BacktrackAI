import { getDatabase, generateId, getCurrentTimestamp } from '../db';
import { Folder } from '../models';
import { TABLES } from '../models';

export interface CreateFolderData {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateFolderData {
  name?: string;
  description?: string;
  color?: string;
}

export class FoldersRepository {
  // Create a new folder
  static async create(data: CreateFolderData): Promise<Folder> {
    const db = await getDatabase();
    const id = generateId();
    const now = getCurrentTimestamp();

    const folder: Folder = {
      id,
      ...data,
      created_at: now,
      updated_at: now,
    };

    await db.runAsync(
      `INSERT INTO ${TABLES.FOLDERS} (id, name, description, color, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        folder.id,
        folder.name,
        folder.description || null,
        folder.color || null,
        folder.created_at,
        folder.updated_at,
      ]
    );

    return folder;
  }

  // Get folder by ID
  static async getById(id: string): Promise<Folder | null> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<Folder>(
      `SELECT * FROM ${TABLES.FOLDERS} WHERE id = ?`,
      [id]
    );
    return result || null;
  }

  // Get all folders
  static async getAll(): Promise<Folder[]> {
    const db = await getDatabase();
    const results = await db.getAllAsync<Folder>(
      `SELECT * FROM ${TABLES.FOLDERS} ORDER BY name ASC`
    );
    return results;
  }

  // Search folders by name
  static async search(query: string): Promise<Folder[]> {
    const db = await getDatabase();
    const searchTerm = `%${query}%`;
    const results = await db.getAllAsync<Folder>(
      `SELECT * FROM ${TABLES.FOLDERS} 
       WHERE name LIKE ? OR description LIKE ? 
       ORDER BY name ASC`,
      [searchTerm, searchTerm]
    );
    return results;
  }

  // Update folder
  static async update(id: string, data: UpdateFolderData): Promise<Folder | null> {
    const db = await getDatabase();
    const now = getCurrentTimestamp();

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.color !== undefined) {
      updates.push('color = ?');
      values.push(data.color);
    }

    if (updates.length === 0) {
      return await this.getById(id);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await db.runAsync(
      `UPDATE ${TABLES.FOLDERS} SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return await this.getById(id);
  }

  // Delete folder
  static async delete(id: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync(
      `DELETE FROM ${TABLES.FOLDERS} WHERE id = ?`,
      [id]
    );
    return result.changes > 0;
  }

  // Get folders count
  static async getCount(): Promise<number> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${TABLES.FOLDERS}`
    );
    return result?.count || 0;
  }

  // Get items in folder
  static async getItemsInFolder(folderId: string): Promise<any[]> {
    const db = await getDatabase();
    const results = await db.getAllAsync(
      `SELECT i.* FROM ${TABLES.ITEMS} i
       INNER JOIN ${TABLES.ITEM_FOLDERS} if ON i.id = if.item_id
       WHERE if.folder_id = ?
       ORDER BY i.created_at DESC`,
      [folderId]
    );
    return results;
  }

  // Add item to folder
  static async addItemToFolder(itemId: string, folderId: string): Promise<boolean> {
    const db = await getDatabase();
    try {
      await db.runAsync(
        `INSERT INTO ${TABLES.ITEM_FOLDERS} (item_id, folder_id, created_at)
         VALUES (?, ?, ?)`,
        [itemId, folderId, getCurrentTimestamp()]
      );
      return true;
    } catch (error) {
      // Handle duplicate key error
      return false;
    }
  }

  // Remove item from folder
  static async removeItemFromFolder(itemId: string, folderId: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync(
      `DELETE FROM ${TABLES.ITEM_FOLDERS} 
       WHERE item_id = ? AND folder_id = ?`,
      [itemId, folderId]
    );
    return result.changes > 0;
  }

  // Get folders for item
  static async getFoldersForItem(itemId: string): Promise<Folder[]> {
    const db = await getDatabase();
    const results = await db.getAllAsync<Folder>(
      `SELECT f.* FROM ${TABLES.FOLDERS} f
       INNER JOIN ${TABLES.ITEM_FOLDERS} if ON f.id = if.folder_id
       WHERE if.item_id = ?
       ORDER BY f.name ASC`,
      [itemId]
    );
    return results;
  }
}
