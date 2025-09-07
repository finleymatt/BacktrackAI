import { useState, useEffect, useCallback } from 'react';
import { Item } from '../../data/models';
import { ItemService } from './itemService';

// Hook for managing items not in a specific folder
export const useItemsNotInFolder = (folderId: string) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    if (!folderId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await ItemService.getItemsNotInFolder(folderId);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  return {
    items,
    loading,
    error,
    loadItems,
  };
};

// Hook for managing recent items not in any folder
export const useRecentItemsNotInFolders = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ItemService.getRecentItemsNotInFolders();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recent items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  return {
    items,
    loading,
    error,
    loadItems,
  };
};

// Hook for managing all items
export const useItems = (limit: number = 50) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ItemService.getAllItems(limit);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  return {
    items,
    loading,
    error,
    loadItems,
  };
};
