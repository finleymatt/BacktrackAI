import { ItemsRepository, CreateItemData, UpdateItemData } from '../../data/repositories/items';
import { Item } from '../../data/models';

export class ItemService {
  // Create a new item
  static async createItem(data: CreateItemData): Promise<Item> {
    return await ItemsRepository.create(data);
  }

  // Get all items
  static async getAllItems(limit: number = 50, offset: number = 0): Promise<Item[]> {
    return await ItemsRepository.getAll(limit, offset);
  }

  // Get item by ID
  static async getItemById(id: string): Promise<Item | null> {
    return await ItemsRepository.getById(id);
  }

  // Update item
  static async updateItem(id: string, data: UpdateItemData): Promise<Item | null> {
    return await ItemsRepository.update(id, data);
  }

  // Delete item
  static async deleteItem(id: string): Promise<boolean> {
    return await ItemsRepository.delete(id);
  }

  // Search items
  static async searchItems(query: string, limit: number = 50, offset: number = 0): Promise<Item[]> {
    return await ItemsRepository.search(query, limit, offset);
  }

  // Get recent items
  static async getRecentItems(days: number = 7): Promise<Item[]> {
    return await ItemsRepository.getRecentItems(days);
  }

  // Get items not in a specific folder
  static async getItemsNotInFolder(folderId: string, limit: number = 50, offset: number = 0): Promise<Item[]> {
    return await ItemsRepository.getItemsNotInFolder(folderId, limit, offset);
  }

  // Get recent items not in any folder
  static async getRecentItemsNotInFolders(limit: number = 20): Promise<Item[]> {
    return await ItemsRepository.getRecentItemsNotInFolders(limit);
  }

  // Get items needing OCR
  static async getItemsNeedingOcr(limit: number = 50): Promise<Item[]> {
    return await ItemsRepository.getItemsNeedingOcr(limit);
  }

  // Get items with OCR
  static async getItemsWithOcr(limit: number = 50, offset: number = 0): Promise<Item[]> {
    return await ItemsRepository.getItemsWithOcr(limit, offset);
  }
}
