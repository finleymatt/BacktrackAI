import { useState, useEffect, useCallback } from 'react';
import { SyncService, SyncResult, SyncStatus } from './sync';

// Hook for sync status
export const useSyncStatus = () => {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const syncStatus = await SyncService.getSyncStatus();
      setStatus(syncStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get sync status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  return {
    status,
    loading,
    error,
    refreshStatus
  };
};

// Hook for sync operations
export const useSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sync = useCallback(async (): Promise<SyncResult> => {
    try {
      setIsSyncing(true);
      setError(null);
      
      const result = await SyncService.syncAll();
      setLastSyncResult(result);
      
      if (!result.success) {
        setError(result.errors.join(', '));
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync failed';
      setError(errorMessage);
      const failedResult: SyncResult = {
        success: false,
        itemsSynced: 0,
        foldersSynced: 0,
        tagsSynced: 0,
        conflictsResolved: 0,
        errors: [errorMessage],
        syncMetadata: {
          pushed: 0,
          pulled: 0,
          conflicts: 0
        }
      };
      setLastSyncResult(failedResult);
      return failedResult;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return {
    sync,
    isSyncing,
    lastSyncResult,
    error
  };
};

// Hook for marking data as dirty
export const useMarkDirty = () => {
  const markItemDirty = useCallback(async (itemId: string) => {
    try {
      await SyncService.markItemDirty(itemId);
    } catch (error) {
      console.error('Failed to mark item as dirty:', error);
    }
  }, []);

  const markFolderDirty = useCallback(async (folderId: string) => {
    try {
      await SyncService.markFolderDirty(folderId);
    } catch (error) {
      console.error('Failed to mark folder as dirty:', error);
    }
  }, []);

  const markTagDirty = useCallback(async (tagId: string) => {
    try {
      await SyncService.markTagDirty(tagId);
    } catch (error) {
      console.error('Failed to mark tag as dirty:', error);
    }
  }, []);

  return {
    markItemDirty,
    markFolderDirty,
    markTagDirty
  };
};

// Hook for authentication status
export const useAuthStatus = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const authenticated = await SyncService.isAuthenticated();
      setIsAuthenticated(authenticated);
    } catch (error) {
      console.error('Failed to check auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    isAuthenticated,
    loading,
    checkAuth
  };
};

// Hook for conflict history (debugging)
export const useConflictHistory = () => {
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadConflicts = useCallback(async () => {
    try {
      setLoading(true);
      const history = await SyncService.getConflictHistory();
      setConflicts(history);
    } catch (error) {
      console.error('Failed to load conflict history:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    conflicts,
    loading,
    loadConflicts
  };
};
