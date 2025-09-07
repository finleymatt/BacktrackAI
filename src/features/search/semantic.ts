import { supabase } from '../../lib/supabase';
import { getDatabase } from '../../data/db';
import { Item, SearchResult } from '../../data/models';
import { TABLES } from '../../data/models';

export interface SemanticSearchOptions {
  query: string;
  userId: string;
  matchThreshold?: number;
  matchCount?: number;
  includeLocalFallback?: boolean;
}

export interface SemanticSearchResult extends SearchResult {
  similarity?: number;
  searchType: 'semantic' | 'keyword';
}

export class SemanticSearchService {
  private static readonly OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
  private static readonly EMBEDDING_MODEL = 'text-embedding-3-small'; // 1536 dimensions
  private static readonly DEFAULT_MATCH_THRESHOLD = 0.5;
  private static readonly DEFAULT_MATCH_COUNT = 20;

  /**
   * Check if semantic search is available (pgvector or JSONB fallback enabled and user authenticated)
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        return false;
      }

      // First try pgvector approach
      const { error: vectorError } = await supabase.rpc('search_items_by_embedding', {
        query_embedding: new Array(1536).fill(0), // Dummy vector
        user_uuid: user.id,
        match_threshold: 1.0, // High threshold to get no results
        match_count: 1
      });

      if (!vectorError) {
        return true;
      }

      // If pgvector fails, try JSONB fallback
      const { error: jsonbError } = await supabase.rpc('search_items_by_embedding_jsonb', {
        query_embedding: new Array(1536).fill(0), // Dummy JSONB array
        user_uuid: user.id,
        match_threshold: 1.0, // High threshold to get no results
        match_count: 1
      });

      return !jsonbError;
    } catch (error) {
      console.log('Semantic search not available:', error);
      return false;
    }
  }

  /**
   * Generate embedding for text using OpenAI API
   */
  private static async generateEmbedding(text: string): Promise<number[]> {
    try {
      // In a real implementation, you would call OpenAI API here
      // For now, we'll use a mock embedding generator
      // This should be replaced with actual OpenAI API call
      
      const response = await fetch(this.OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY || 'your-api-key'}`
        },
        body: JSON.stringify({
          model: this.EMBEDDING_MODEL,
          input: text
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      // Fallback to mock embedding for development
      return this.generateMockEmbedding(text);
    }
  }

  /**
   * Generate a mock embedding for development/testing
   */
  private static generateMockEmbedding(text: string): number[] {
    // Simple hash-based mock embedding
    const hash = this.simpleHash(text);
    const embedding = new Array(1536).fill(0);
    
    // Distribute the hash across the embedding dimensions
    for (let i = 0; i < 1536; i++) {
      embedding[i] = Math.sin(hash + i) * 0.1;
    }
    
    return embedding;
  }

  /**
   * Simple hash function for mock embeddings
   */
  private static simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Perform semantic search using vector similarity
   */
  static async search(options: SemanticSearchOptions): Promise<SemanticSearchResult[]> {
    const {
      query,
      userId,
      matchThreshold = this.DEFAULT_MATCH_THRESHOLD,
      matchCount = this.DEFAULT_MATCH_COUNT,
      includeLocalFallback = true
    } = options;

    try {
      // Check if semantic search is available
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        if (includeLocalFallback) {
          console.log('Semantic search not available, falling back to keyword search');
          return this.fallbackToKeywordSearch(query, matchCount);
        }
        throw new Error('Semantic search not available');
      }

      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);

      // Try pgvector search first, then fallback to JSONB
      let data, error;
      
      try {
        const result = await supabase.rpc('search_items_by_embedding', {
          query_embedding: queryEmbedding,
          user_uuid: userId,
          match_threshold: matchThreshold,
          match_count: matchCount
        });
        data = result.data;
        error = result.error;
      } catch (vectorError) {
        // If pgvector fails, try JSONB fallback
        console.log('pgvector search failed, trying JSONB fallback:', vectorError);
        const result = await supabase.rpc('search_items_by_embedding_jsonb', {
          query_embedding: queryEmbedding,
          user_uuid: userId,
          match_threshold: matchThreshold,
          match_count: matchCount
        });
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Semantic search error:', error);
        if (includeLocalFallback) {
          return this.fallbackToKeywordSearch(query, matchCount);
        }
        throw error;
      }

      // Convert results to SearchResult format
      const results: SemanticSearchResult[] = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        content_url: item.content_url,
        thumbnail_url: item.thumbnail_url,
        source: item.source,
        platform: item.platform,
        source_date: null,
        ocr_text: null,
        ocr_done: false,
        ocr_status: null,
        created_at: '',
        ingested_at: '',
        updated_at: '',
        similarity: item.similarity,
        relevanceScore: item.similarity * 100, // Convert to 0-100 scale
        matchedFields: ['semantic'],
        searchType: 'semantic' as const
      }));

      return results;
    } catch (error) {
      console.error('Semantic search failed:', error);
      if (includeLocalFallback) {
        return this.fallbackToKeywordSearch(query, matchCount);
      }
      throw error;
    }
  }

  /**
   * Fallback to keyword search when semantic search is not available
   */
  private static async fallbackToKeywordSearch(query: string, limit: number): Promise<SemanticSearchResult[]> {
    try {
      const db = await getDatabase();
      
      const searchTerm = `%${query}%`;
      const results = await db.getAllAsync<any>(
        `SELECT * FROM ${TABLES.ITEMS} 
         WHERE title LIKE ? OR description LIKE ? OR ocr_text LIKE ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [searchTerm, searchTerm, searchTerm, limit]
      );

      return results.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        content_url: item.content_url,
        thumbnail_url: item.thumbnail_url,
        source: item.source,
        platform: item.platform,
        source_date: item.source_date,
        ocr_text: item.ocr_text,
        ocr_done: Boolean(item.ocr_done),
        ocr_status: item.ocr_status,
        created_at: item.created_at,
        ingested_at: item.ingested_at,
        updated_at: item.updated_at,
        relevanceScore: 50, // Default score for keyword matches
        matchedFields: ['keyword'],
        searchType: 'keyword' as const
      }));
    } catch (error) {
      console.error('Fallback keyword search failed:', error);
      return [];
    }
  }

  /**
   * Generate and store embeddings for an item
   */
  static async generateItemEmbedding(item: Item, userId: string): Promise<boolean> {
    try {
      // Combine text content for embedding
      const textContent = [
        item.title,
        item.description,
        item.ocr_text
      ].filter(Boolean).join(' ');

      if (!textContent.trim()) {
        console.log('No text content to embed for item:', item.id);
        return false;
      }

      // Generate embedding
      const embedding = await this.generateEmbedding(textContent);

      // Store in Supabase
      const { error } = await supabase.rpc('update_item_embedding', {
        item_id: item.id,
        embedding: embedding,
        user_uuid: userId
      });

      if (error) {
        console.error('Failed to store embedding:', error);
        return false;
      }

      console.log('Successfully generated and stored embedding for item:', item.id);
      return true;
    } catch (error) {
      console.error('Failed to generate item embedding:', error);
      return false;
    }
  }

  /**
   * Batch generate embeddings for multiple items
   */
  static async batchGenerateEmbeddings(items: Item[], userId: string): Promise<{
    successCount: number;
    failedCount: number;
    errors: string[];
  }> {
    const result = {
      successCount: 0,
      failedCount: 0,
      errors: [] as string[]
    };

    // Process items in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (item) => {
        try {
          const success = await this.generateItemEmbedding(item, userId);
          if (success) {
            result.successCount++;
          } else {
            result.failedCount++;
            result.errors.push(`Failed to generate embedding for item: ${item.id}`);
          }
        } catch (error) {
          result.failedCount++;
          result.errors.push(`Error processing item ${item.id}: ${error}`);
        }
      });

      await Promise.all(batchPromises);
      
      // Add delay between batches to respect API rate limits
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return result;
  }

  /**
   * Get items that need embeddings generated
   */
  static async getItemsNeedingEmbeddings(userId: string, limit: number = 50): Promise<Item[]> {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', userId)
        .is('items_embedding', null)
        .limit(limit);

      if (error) {
        console.error('Failed to get items needing embeddings:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        content_url: item.content_url,
        thumbnail_url: item.thumbnail_url,
        source: item.source,
        platform: item.platform,
        source_date: item.source_date,
        ocr_text: item.ocr_text,
        ocr_done: Boolean(item.ocr_done),
        ocr_status: item.ocr_status,
        created_at: item.created_at,
        ingested_at: item.ingested_at,
        updated_at: item.updated_at
      }));
    } catch (error) {
      console.error('Error getting items needing embeddings:', error);
      return [];
    }
  }

  /**
   * Get semantic search statistics
   */
  static async getSemanticSearchStats(userId: string): Promise<{
    totalItems: number;
    itemsWithEmbeddings: number;
    itemsWithoutEmbeddings: number;
    embeddingCoverage: number;
  }> {
    try {
      const { data: totalData, error: totalError } = await supabase
        .from('items')
        .select('id', { count: 'exact' })
        .eq('user_id', userId);

      const { data: embeddedData, error: embeddedError } = await supabase
        .from('items')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .not('items_embedding', 'is', null);

      if (totalError || embeddedError) {
        throw new Error('Failed to get semantic search stats');
      }

      const totalItems = totalData?.[0]?.count || 0;
      const itemsWithEmbeddings = embeddedData?.[0]?.count || 0;
      const itemsWithoutEmbeddings = totalItems - itemsWithEmbeddings;
      const embeddingCoverage = totalItems > 0 ? (itemsWithEmbeddings / totalItems) * 100 : 0;

      return {
        totalItems,
        itemsWithEmbeddings,
        itemsWithoutEmbeddings,
        embeddingCoverage
      };
    } catch (error) {
      console.error('Error getting semantic search stats:', error);
      return {
        totalItems: 0,
        itemsWithEmbeddings: 0,
        itemsWithoutEmbeddings: 0,
        embeddingCoverage: 0
      };
    }
  }
}
