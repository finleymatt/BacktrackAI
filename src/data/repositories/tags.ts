import { getDatabase, generateId, getCurrentTimestamp } from '../db';
import { Tag } from '../models';
import { TABLES } from '../models';

export interface CreateTagData {
  name: string;
  color?: string;
}

export interface UpdateTagData {
  name?: string;
  color?: string;
}

export class TagsRepository {
  // Create a new tag
  static async create(data: CreateTagData): Promise<Tag> {
    const db = await getDatabase();
    const id = generateId();
    const now = getCurrentTimestamp();

    const tag: Tag = {
      id,
      ...data,
      created_at: now,
      updated_at: now,
    };

    await db.runAsync(
      `INSERT INTO ${TABLES.TAGS} (id, name, color, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        tag.id,
        tag.name,
        tag.color || null,
        tag.created_at,
        tag.updated_at,
      ]
    );

    return tag;
  }

  // Get tag by ID
  static async getById(id: string): Promise<Tag | null> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<Tag>(
      `SELECT * FROM ${TABLES.TAGS} WHERE id = ?`,
      [id]
    );
    return result || null;
  }

  // Get tag by name
  static async getByName(name: string): Promise<Tag | null> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<Tag>(
      `SELECT * FROM ${TABLES.TAGS} WHERE name = ?`,
      [name]
    );
    return result || null;
  }

  // Get all tags
  static async getAll(): Promise<Tag[]> {
    const db = await getDatabase();
    const results = await db.getAllAsync<Tag>(
      `SELECT * FROM ${TABLES.TAGS} ORDER BY name ASC`
    );
    return results;
  }

  // Search tags by name
  static async search(query: string): Promise<Tag[]> {
    const db = await getDatabase();
    const searchTerm = `%${query}%`;
    const results = await db.getAllAsync<Tag>(
      `SELECT * FROM ${TABLES.TAGS} 
       WHERE name LIKE ? 
       ORDER BY name ASC`,
      [searchTerm]
    );
    return results;
  }

  // Update tag
  static async update(id: string, data: UpdateTagData): Promise<Tag | null> {
    const db = await getDatabase();
    const now = getCurrentTimestamp();

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
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
      `UPDATE ${TABLES.TAGS} SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return await this.getById(id);
  }

  // Delete tag
  static async delete(id: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync(
      `DELETE FROM ${TABLES.TAGS} WHERE id = ?`,
      [id]
    );
    return result.changes > 0;
  }

  // Get tags count
  static async getCount(): Promise<number> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${TABLES.TAGS}`
    );
    return result?.count || 0;
  }

  // Get items with tag
  static async getItemsWithTag(tagId: string): Promise<any[]> {
    const db = await getDatabase();
    const results = await db.getAllAsync(
      `SELECT i.* FROM ${TABLES.ITEMS} i
       INNER JOIN ${TABLES.ITEM_TAGS} it ON i.id = it.item_id
       WHERE it.tag_id = ?
       ORDER BY i.created_at DESC`,
      [tagId]
    );
    return results;
  }

  // Add tag to item
  static async addTagToItem(itemId: string, tagId: string): Promise<boolean> {
    const db = await getDatabase();
    try {
      await db.runAsync(
        `INSERT INTO ${TABLES.ITEM_TAGS} (item_id, tag_id, created_at)
         VALUES (?, ?, ?)`,
        [itemId, tagId, getCurrentTimestamp()]
      );
      return true;
    } catch (error) {
      // Handle duplicate key error
      return false;
    }
  }

  // Remove tag from item
  static async removeTagFromItem(itemId: string, tagId: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync(
      `DELETE FROM ${TABLES.ITEM_TAGS} 
       WHERE item_id = ? AND tag_id = ?`,
      [itemId, tagId]
    );
    return result.changes > 0;
  }

  // Get tags for item
  static async getTagsForItem(itemId: string): Promise<Tag[]> {
    const db = await getDatabase();
    const results = await db.getAllAsync<Tag>(
      `SELECT t.* FROM ${TABLES.TAGS} t
       INNER JOIN ${TABLES.ITEM_TAGS} it ON t.id = it.tag_id
       WHERE it.item_id = ?
       ORDER BY t.name ASC`,
      [itemId]
    );
    return results;
  }

  // Get or create tag by name
  static async getOrCreate(name: string, color?: string): Promise<Tag> {
    const existing = await this.getByName(name);
    if (existing) {
      return existing;
    }
    return await this.create({ name, color });
  }
}
