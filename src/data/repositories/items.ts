import { getDatabase, generateId, getCurrentTimestamp } from '../db';
import { Item, Source } from '../models';
import { TABLES } from '../models';

export interface CreateItemData {
  title: string;
  description?: string;
  content_url?: string;
  thumbnail_url?: string;
  source: Source;
}

export interface UpdateItemData {
  title?: string;
  description?: string;
  content_url?: string;
  thumbnail_url?: string;
}

export class ItemsRepository {
  // Create a new item
  static async create(data: CreateItemData): Promise<Item> {
    const db = await getDatabase();
    const id = generateId();
    const now = getCurrentTimestamp();

    const item: Item = {
      id,
      ...data,
      created_at: now,
      ingested_at: now,
      updated_at: now,
    };

    await db.runAsync(
      `INSERT INTO ${TABLES.ITEMS} (id, title, description, content_url, thumbnail_url, source, created_at, ingested_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.title,
        item.description || null,
        item.content_url || null,
        item.thumbnail_url || null,
        item.source,
        item.created_at,
        item.ingested_at,
        item.updated_at,
      ]
    );

    return item;
  }

  // Get item by ID
  static async getById(id: string): Promise<Item | null> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<Item>(
      `SELECT * FROM ${TABLES.ITEMS} WHERE id = ?`,
      [id]
    );
    return result || null;
  }

  // Get all items with pagination
  static async getAll(limit: number = 50, offset: number = 0): Promise<Item[]> {
    const db = await getDatabase();
    const results = await db.getAllAsync<Item>(
      `SELECT * FROM ${TABLES.ITEMS} 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return results;
  }

  // Get items by source
  static async getBySource(source: Source, limit: number = 50, offset: number = 0): Promise<Item[]> {
    const db = await getDatabase();
    const results = await db.getAllAsync<Item>(
      `SELECT * FROM ${TABLES.ITEMS} 
       WHERE source = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [source, limit, offset]
    );
    return results;
  }

  // Search items by title or description
  static async search(query: string, limit: number = 50, offset: number = 0): Promise<Item[]> {
    const db = await getDatabase();
    const searchTerm = `%${query}%`;
    const results = await db.getAllAsync<Item>(
      `SELECT * FROM ${TABLES.ITEMS} 
       WHERE title LIKE ? OR description LIKE ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [searchTerm, searchTerm, limit, offset]
    );
    return results;
  }

  // Update item
  static async update(id: string, data: UpdateItemData): Promise<Item | null> {
    const db = await getDatabase();
    const now = getCurrentTimestamp();

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.content_url !== undefined) {
      updates.push('content_url = ?');
      values.push(data.content_url);
    }
    if (data.thumbnail_url !== undefined) {
      updates.push('thumbnail_url = ?');
      values.push(data.thumbnail_url);
    }

    if (updates.length === 0) {
      return await this.getById(id);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await db.runAsync(
      `UPDATE ${TABLES.ITEMS} SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return await this.getById(id);
  }

  // Delete item
  static async delete(id: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync(
      `DELETE FROM ${TABLES.ITEMS} WHERE id = ?`,
      [id]
    );
    return result.changes > 0;
  }

  // Get items count
  static async getCount(): Promise<number> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${TABLES.ITEMS}`
    );
    return result?.count || 0;
  }

  // Get recent items (last 7 days)
  static async getRecentItems(days: number = 7): Promise<Item[]> {
    const db = await getDatabase();
    const results = await db.getAllAsync<Item>(
      `SELECT * FROM ${TABLES.ITEMS} 
       WHERE created_at >= datetime('now', '-${days} days') 
       ORDER BY created_at DESC`
    );
    return results;
  }

  // Get recent items count
  static async getRecentItemsCount(days: number = 7): Promise<number> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${TABLES.ITEMS} 
       WHERE created_at >= datetime('now', '-${days} days')`
    );
    return result?.count || 0;
  }
}
