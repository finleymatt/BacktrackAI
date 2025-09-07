import { FoldersRepository, CreateFolderData, UpdateFolderData } from '../../data/repositories/folders';
import { Folder } from '../../data/models';

export class FolderService {
  // Create a new folder
  static async createFolder(data: CreateFolderData): Promise<Folder> {
    return await FoldersRepository.create(data);
  }

  // Get all folders
  static async getAllFolders(): Promise<Folder[]> {
    return await FoldersRepository.getAll();
  }

  // Get folder by ID
  static async getFolderById(id: string): Promise<Folder | null> {
    return await FoldersRepository.getById(id);
  }

  // Update folder
  static async updateFolder(id: string, data: UpdateFolderData): Promise<Folder | null> {
    return await FoldersRepository.update(id, data);
  }

  // Delete folder
  static async deleteFolder(id: string): Promise<boolean> {
    return await FoldersRepository.delete(id);
  }

  // Search folders
  static async searchFolders(query: string): Promise<Folder[]> {
    return await FoldersRepository.search(query);
  }

  // Toggle folder privacy
  static async toggleFolderPrivacy(id: string, isPublic: boolean): Promise<Folder | null> {
    return await FoldersRepository.update(id, { is_public: isPublic });
  }

  // Get items in folder
  static async getItemsInFolder(folderId: string): Promise<any[]> {
    return await FoldersRepository.getItemsInFolder(folderId);
  }

  // Add item to folder
  static async addItemToFolder(itemId: string, folderId: string): Promise<boolean> {
    return await FoldersRepository.addItemToFolder(itemId, folderId);
  }

  // Remove item from folder
  static async removeItemFromFolder(itemId: string, folderId: string): Promise<boolean> {
    return await FoldersRepository.removeItemFromFolder(itemId, folderId);
  }

  // Get folders for item
  static async getFoldersForItem(itemId: string): Promise<Folder[]> {
    return await FoldersRepository.getFoldersForItem(itemId);
  }

  // Get folder count
  static async getFolderCount(): Promise<number> {
    return await FoldersRepository.getCount();
  }
}
