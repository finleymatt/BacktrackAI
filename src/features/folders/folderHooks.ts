import { useState, useEffect, useCallback } from 'react';
import { Folder } from '../../data/models';
import { FolderService } from './folderService';

// Hook for managing folders list
export const useFolders = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFolders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await FolderService.getAllFolders();
      setFolders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load folders');
    } finally {
      setLoading(false);
    }
  }, []);

  const createFolder = useCallback(async (data: { name: string; description?: string; color?: string; is_public?: boolean }) => {
    try {
      const newFolder = await FolderService.createFolder(data);
      setFolders(prev => [...prev, newFolder]);
      return newFolder;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
      throw err;
    }
  }, []);

  const updateFolder = useCallback(async (id: string, data: { name?: string; description?: string; color?: string; is_public?: boolean }) => {
    try {
      const updatedFolder = await FolderService.updateFolder(id, data);
      if (updatedFolder) {
        setFolders(prev => prev.map(f => f.id === id ? updatedFolder : f));
      }
      return updatedFolder;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update folder');
      throw err;
    }
  }, []);

  const deleteFolder = useCallback(async (id: string) => {
    try {
      const success = await FolderService.deleteFolder(id);
      if (success) {
        setFolders(prev => prev.filter(f => f.id !== id));
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete folder');
      throw err;
    }
  }, []);

  const togglePrivacy = useCallback(async (id: string, isPublic: boolean) => {
    try {
      const updatedFolder = await FolderService.toggleFolderPrivacy(id, isPublic);
      if (updatedFolder) {
        setFolders(prev => prev.map(f => f.id === id ? updatedFolder : f));
      }
      return updatedFolder;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle folder privacy');
      throw err;
    }
  }, []);

  const addItemToFolder = useCallback(async (itemId: string, folderId: string) => {
    try {
      const success = await FolderService.addItemToFolder(itemId, folderId);
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item to folder');
      throw err;
    }
  }, []);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  return {
    folders,
    loading,
    error,
    loadFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    togglePrivacy,
    addItemToFolder,
  };
};

// Hook for managing a single folder
export const useFolder = (id: string) => {
  const [folder, setFolder] = useState<Folder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFolder = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await FolderService.getFolderById(id);
      setFolder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load folder');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const updateFolder = useCallback(async (data: { name?: string; description?: string; color?: string; is_public?: boolean }) => {
    if (!id) return null;
    
    try {
      const updatedFolder = await FolderService.updateFolder(id, data);
      if (updatedFolder) {
        setFolder(updatedFolder);
      }
      return updatedFolder;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update folder');
      throw err;
    }
  }, [id]);

  const togglePrivacy = useCallback(async (isPublic: boolean) => {
    if (!id) return null;
    
    try {
      const updatedFolder = await FolderService.toggleFolderPrivacy(id, isPublic);
      if (updatedFolder) {
        setFolder(updatedFolder);
      }
      return updatedFolder;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle folder privacy');
      throw err;
    }
  }, [id]);

  useEffect(() => {
    loadFolder();
  }, [loadFolder]);

  return {
    folder,
    loading,
    error,
    loadFolder,
    updateFolder,
    togglePrivacy,
  };
};

// Hook for managing folder items
export const useFolderItems = (folderId: string) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    if (!folderId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await FolderService.getItemsInFolder(folderId);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load folder items');
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  const addItem = useCallback(async (itemId: string) => {
    if (!folderId) return false;
    
    try {
      const success = await FolderService.addItemToFolder(itemId, folderId);
      if (success) {
        await loadItems(); // Reload items
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item to folder');
      throw err;
    }
  }, [folderId, loadItems]);

  const removeItem = useCallback(async (itemId: string) => {
    if (!folderId) return false;
    
    try {
      const success = await FolderService.removeItemFromFolder(itemId, folderId);
      if (success) {
        await loadItems(); // Reload items
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove item from folder');
      throw err;
    }
  }, [folderId, loadItems]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  return {
    items,
    loading,
    error,
    loadItems,
    addItem,
    removeItem,
  };
};
