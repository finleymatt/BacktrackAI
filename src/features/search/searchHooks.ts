import { useState, useEffect, useCallback, useMemo } from 'react';
import { SearchService, SearchOptions, SearchResult, SearchFilters } from './search';
import { Source, Platform, Tag } from '../../data/models';

export interface UseSearchOptions {
  debounceMs?: number;
  defaultLimit?: number;
}

export interface UseSearchReturn {
  // Search state
  query: string;
  setQuery: (query: string) => void;
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  
  // Search actions
  search: (options?: Partial<SearchOptions>) => Promise<void>;
  clearSearch: () => void;
  
  // Filter actions
  addSourceFilter: (source: Source) => void;
  removeSourceFilter: (source: Source) => void;
  addPlatformFilter: (platform: Platform) => void;
  removePlatformFilter: (platform: Platform) => void;
  addTagFilter: (tagName: string) => void;
  removeTagFilter: (tagName: string) => void;
  setDateRange: (start?: string, end?: string) => void;
  clearFilters: () => void;
  
  // Suggestions
  suggestions: string[];
  isLoadingSuggestions: boolean;
  
  // Filter options
  availableFilters: {
    sourceTypes: Source[];
    platforms: Platform[];
    tags: Tag[];
  } | null;
  isLoadingFilters: boolean;
}

export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const { debounceMs = 300, defaultLimit = 50 } = options;
  
  // Search state
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Suggestions state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  
  // Filter options state
  const [availableFilters, setAvailableFilters] = useState<{
    sourceTypes: Source[];
    platforms: Platform[];
    tags: Tag[];
  } | null>(null);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);

  // Load available filter options
  const loadFilterOptions = useCallback(async () => {
    setIsLoadingFilters(true);
    try {
      const options = await SearchService.getFilterOptions();
      setAvailableFilters(options);
    } catch (err) {
      console.error('Failed to load filter options:', err);
    } finally {
      setIsLoadingFilters(false);
    }
  }, []);

  // Load suggestions
  const loadSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const suggestions = await SearchService.getSearchSuggestions(searchQuery);
      setSuggestions(suggestions);
    } catch (err) {
      console.error('Failed to load suggestions:', err);
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  // Perform search
  const search = useCallback(async (searchOptions?: Partial<SearchOptions>) => {
    const searchQuery = searchOptions?.query ?? query;
    const searchFilters = searchOptions?.filters ?? filters;
    
    if (!searchQuery.trim() && Object.keys(searchFilters).length === 0) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const searchResults = await SearchService.search({
        query: searchQuery,
        filters: searchFilters,
        limit: defaultLimit,
        offset: 0,
      });
      setResults(searchResults);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      setResults([]);
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [query, filters, defaultLimit]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
    setSuggestions([]);
  }, []);

  // Filter actions
  const addSourceFilter = useCallback((source: Source) => {
    setFilters(prev => ({
      ...prev,
      sourceTypes: [...(prev.sourceTypes || []), source],
    }));
  }, []);

  const removeSourceFilter = useCallback((source: Source) => {
    setFilters(prev => ({
      ...prev,
      sourceTypes: prev.sourceTypes?.filter(s => s !== source) || [],
    }));
  }, []);

  const addPlatformFilter = useCallback((platform: Platform) => {
    setFilters(prev => ({
      ...prev,
      platforms: [...(prev.platforms || []), platform],
    }));
  }, []);

  const removePlatformFilter = useCallback((platform: Platform) => {
    setFilters(prev => ({
      ...prev,
      platforms: prev.platforms?.filter(p => p !== platform) || [],
    }));
  }, []);

  const addTagFilter = useCallback((tagName: string) => {
    setFilters(prev => ({
      ...prev,
      tags: [...(prev.tags || []), tagName],
    }));
  }, []);

  const removeTagFilter = useCallback((tagName: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags?.filter(t => t !== tagName) || [],
    }));
  }, []);

  const setDateRange = useCallback((start?: string, end?: string) => {
    setFilters(prev => ({
      ...prev,
      dateRange: { start, end },
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      search();
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [query, filters, search, debounceMs]);

  // Load suggestions effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadSuggestions(query);
    }, 200); // Shorter debounce for suggestions

    return () => clearTimeout(timeoutId);
  }, [query, loadSuggestions]);

  // Load filter options on mount
  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  return {
    // Search state
    query,
    setQuery,
    filters,
    setFilters,
    results,
    isLoading,
    error,
    
    // Search actions
    search,
    clearSearch,
    
    // Filter actions
    addSourceFilter,
    removeSourceFilter,
    addPlatformFilter,
    removePlatformFilter,
    addTagFilter,
    removeTagFilter,
    setDateRange,
    clearFilters,
    
    // Suggestions
    suggestions,
    isLoadingSuggestions,
    
    // Filter options
    availableFilters,
    isLoadingFilters,
  };
}

// Hook for search statistics
export function useSearchStats(query: string, filters: SearchFilters) {
  const [stats, setStats] = useState<{
    totalResults: number;
    resultsBySource: Record<Source, number>;
    resultsByPlatform: Record<Platform, number>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadStats = useCallback(async () => {
    if (!query.trim() && Object.keys(filters).length === 0) {
      setStats(null);
      return;
    }

    setIsLoading(true);
    try {
      const searchStats = await SearchService.getSearchStats(query, filters);
      setStats(searchStats);
    } catch (err) {
      console.error('Failed to load search stats:', err);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [query, filters]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadStats();
    }, 500); // Debounce stats loading

    return () => clearTimeout(timeoutId);
  }, [loadStats]);

  return { stats, isLoading };
}
