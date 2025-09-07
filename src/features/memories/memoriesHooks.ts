import { useState, useEffect } from 'react';
import { 
  getMemoriesWindows, 
  selectMemories, 
  groupMemoriesByPattern,
  MemoryItem,
  MemoriesSettings,
  loadMemoriesSettings,
  saveMemoriesSettings
} from './selectMemories';

/**
 * Hook for managing memories state and operations
 */
export function useMemories() {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [groupedMemories, setGroupedMemories] = useState<{
    yearly: { [year: string]: MemoryItem[] };
    monthly: { [interval: string]: MemoryItem[] };
  }>({ yearly: {}, monthly: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<MemoriesSettings | null>(null);

  const loadMemories = async (customSettings?: MemoriesSettings) => {
    try {
      setLoading(true);
      setError(null);
      
      const memoriesSettings = customSettings || await loadMemoriesSettings();
      setSettings(memoriesSettings);
      
      const today = new Date();
      const windows = getMemoriesWindows(today, memoriesSettings);
      const selectedMemories = await selectMemories(windows, memoriesSettings);
      
      setMemories(selectedMemories);
      
      const grouped = groupMemoriesByPattern(selectedMemories);
      setGroupedMemories(grouped);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memories');
      console.error('Error loading memories:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<MemoriesSettings>) => {
    if (!settings) return;
    
    const updatedSettings = { ...settings, ...updates };
    await saveMemoriesSettings(updatedSettings);
    setSettings(updatedSettings);
    
    // Reload memories with new settings
    await loadMemories(updatedSettings);
  };

  const refreshMemories = () => {
    loadMemories();
  };

  const snoozeMemory = async (memory: MemoryItem, days: number) => {
    // TODO: Implement snooze logic
    console.log(`Snoozing memory ${memory.id} for ${days} days`);
    // For now, just remove from current view
    setMemories(prev => prev.filter(m => m.id !== memory.id));
  };

  const dismissMemory = async (memory: MemoryItem) => {
    // TODO: Implement dismiss logic
    console.log(`Dismissing memory ${memory.id}`);
    // For now, just remove from current view
    setMemories(prev => prev.filter(m => m.id !== memory.id));
  };

  useEffect(() => {
    loadMemories();
  }, []);

  return {
    memories,
    groupedMemories,
    loading,
    error,
    settings,
    loadMemories,
    updateSettings,
    refreshMemories,
    snoozeMemory,
    dismissMemory,
  };
}
