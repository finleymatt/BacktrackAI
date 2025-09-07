import { getDatabase } from '../../data/db';
import { Item, Source, Platform, Tag } from '../../data/models';
import { TABLES } from '../../data/models';

export interface SearchFilters {
  sourceTypes?: Source[];
  platforms?: Platform[];
  tags?: string[]; // tag names
  dateRange?: {
    start?: string; // ISO date string
    end?: string;   // ISO date string
  };
}

export interface SearchOptions {
  query?: string;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
}

export interface SearchResult extends Item {
  relevanceScore?: number;
  matchedFields?: string[];
  tags?: Tag[];
}

export class SearchService {
  /**
   * Keyword expansion mapping for semantic search
   */
  private static readonly KEYWORD_EXPANSIONS: Record<string, string[]> = {
    'football': ['NFL', 'nfl', 'american football', 'gridiron', 'touchdown', 'quarterback', 'super bowl'],
    'soccer': ['football', 'futbol', 'premier league', 'champions league', 'world cup', 'fifa'],
    'basketball': ['NBA', 'nba', 'hoops', 'dunk', 'three pointer', 'playoffs'],
    'baseball': ['MLB', 'mlb', 'home run', 'world series', 'diamond', 'pitcher'],
    'hockey': ['NHL', 'nhl', 'ice hockey', 'puck', 'stanley cup', 'goalie'],
    'tennis': ['wimbledon', 'us open', 'french open', 'australian open', 'grand slam'],
    'music': ['song', 'album', 'artist', 'band', 'concert', 'spotify', 'youtube music'],
    'movie': ['film', 'cinema', 'actor', 'director', 'oscar', 'hollywood'],
    'book': ['novel', 'author', 'reading', 'literature', 'chapter', 'kindle'],
    'cooking': ['recipe', 'chef', 'kitchen', 'food', 'ingredients', 'baking'],
    'travel': ['trip', 'vacation', 'hotel', 'flight', 'destination', 'tourism'],
    'fitness': ['workout', 'exercise', 'gym', 'training', 'health', 'muscle'],
    'hiking': ['trail', 'mountain', 'outdoor', 'nature', 'camping', 'backpacking'],
    'programming': ['coding', 'developer', 'software', 'app', 'website', 'javascript'],
    'photography': ['camera', 'photo', 'picture', 'lens', 'shooting', 'editing'],
  };

  /**
   * Extract domain from URL for domain-based searching
   */
  private static extractDomain(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  /**
   * Expand search query with related keywords
   */
  private static expandSearchQuery(query: string): string[] {
    const queryLower = query.toLowerCase().trim();
    const expandedTerms = new Set<string>([query, queryLower]);
    
    // Add original query variations
    expandedTerms.add(query.toLowerCase());
    expandedTerms.add(query.toUpperCase());
    
    // Check for keyword expansions
    for (const [key, expansions] of Object.entries(this.KEYWORD_EXPANSIONS)) {
      if (queryLower.includes(key) || key.includes(queryLower)) {
        expansions.forEach(term => {
          expandedTerms.add(term);
          expandedTerms.add(term.toLowerCase());
          expandedTerms.add(term.toUpperCase());
        });
      }
    }
    
    // Also check if any expansion keywords match the query
    for (const [key, expansions] of Object.entries(this.KEYWORD_EXPANSIONS)) {
      if (expansions.some(term => term.toLowerCase().includes(queryLower))) {
        expansions.forEach(term => {
          expandedTerms.add(term);
          expandedTerms.add(term.toLowerCase());
          expandedTerms.add(term.toUpperCase());
        });
        expandedTerms.add(key);
        expandedTerms.add(key.toLowerCase());
        expandedTerms.add(key.toUpperCase());
      }
    }
    
    return Array.from(expandedTerms);
  }

  /**
   * Calculate relevance score based on where the query matches
   */
  private static calculateRelevanceScore(
    item: Item,
    query: string,
    matchedFields: string[]
  ): number {
    const queryLower = query.toLowerCase();
    let score = 0;

    // Title matches get highest score
    if (matchedFields.includes('title') && item.title.toLowerCase().includes(queryLower)) {
      score += 10;
      // Exact title match gets bonus
      if (item.title.toLowerCase() === queryLower) {
        score += 5;
      }
    }

    // Description matches
    if (matchedFields.includes('description') && item.description?.toLowerCase().includes(queryLower)) {
      score += 5;
    }

    // OCR text matches
    if (matchedFields.includes('ocr_text') && item.ocr_text?.toLowerCase().includes(queryLower)) {
      score += 3;
    }

    // URL domain matches
    if (matchedFields.includes('domain') && item.content_url) {
      const domain = this.extractDomain(item.content_url);
      if (domain && domain.includes(queryLower)) {
        score += 7;
      }
    }

    // Tag matches
    if (matchedFields.includes('tags')) {
      score += 4;
    }

    return score;
  }

  /**
   * Perform comprehensive search across all searchable fields
   */
  static async search(options: SearchOptions): Promise<SearchResult[]> {
    const { query = '', filters = {}, limit = 50, offset = 0 } = options;
    const db = await getDatabase();

    // Build the base query
    let whereConditions: string[] = [];
    let queryParams: any[] = [];

    // Text search conditions with keyword expansion
    if (query.trim()) {
      const expandedTerms = this.expandSearchQuery(query.trim());
      const textSearchConditions: string[] = [];
      
      // Create search conditions for each expanded term
      expandedTerms.forEach((term) => {
        const searchTerm = `%${term}%`;
        
        textSearchConditions.push(`(
          i.title LIKE ? OR 
          i.description LIKE ? OR 
          i.ocr_text LIKE ?
        )`);
        
        queryParams.push(searchTerm, searchTerm, searchTerm);
        
        // Add URL domain search for terms that look like domains
        if (term.includes('.')) {
          textSearchConditions.push(`i.content_url LIKE ?`);
          queryParams.push(searchTerm);
        }
      });

      if (textSearchConditions.length > 0) {
        whereConditions.push(`(${textSearchConditions.join(' OR ')})`);
      }
    }

    // Source type filter
    if (filters.sourceTypes && filters.sourceTypes.length > 0) {
      const placeholders = filters.sourceTypes.map(() => '?').join(',');
      whereConditions.push(`i.source IN (${placeholders})`);
      queryParams.push(...filters.sourceTypes);
    }

    // Platform filter
    if (filters.platforms && filters.platforms.length > 0) {
      const placeholders = filters.platforms.map(() => '?').join(',');
      whereConditions.push(`i.platform IN (${placeholders})`);
      queryParams.push(...filters.platforms);
    }

    // Date range filter
    if (filters.dateRange) {
      if (filters.dateRange.start) {
        whereConditions.push(`i.created_at >= ?`);
        queryParams.push(filters.dateRange.start);
      }
      if (filters.dateRange.end) {
        whereConditions.push(`i.created_at <= ?`);
        queryParams.push(filters.dateRange.end);
      }
    }

    // Tag filter
    if (filters.tags && filters.tags.length > 0) {
      const tagPlaceholders = filters.tags.map(() => '?').join(',');
      whereConditions.push(`i.id IN (
        SELECT it.item_id FROM ${TABLES.ITEM_TAGS} it
        INNER JOIN ${TABLES.TAGS} t ON it.tag_id = t.id
        WHERE t.name IN (${tagPlaceholders})
      )`);
      queryParams.push(...filters.tags);
    }

    // Build the complete query
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const baseQuery = `
      SELECT DISTINCT i.*, 
             GROUP_CONCAT(t.name) as tag_names,
             GROUP_CONCAT(t.id) as tag_ids,
             GROUP_CONCAT(t.color) as tag_colors
      FROM ${TABLES.ITEMS} i
      LEFT JOIN ${TABLES.ITEM_TAGS} it ON i.id = it.item_id
      LEFT JOIN ${TABLES.TAGS} t ON it.tag_id = t.id
      ${whereClause}
      GROUP BY i.id
      ORDER BY i.created_at DESC
      LIMIT ? OFFSET ?
    `;

    queryParams.push(limit, offset);

    const results = await db.getAllAsync<any>(baseQuery, queryParams);

    // Process results and add relevance scoring
    const processedResults: SearchResult[] = results.map(row => {
      const item: Item = {
        id: row.id,
        title: row.title,
        description: row.description,
        content_url: row.content_url,
        thumbnail_url: row.thumbnail_url,
        source: row.source,
        platform: row.platform,
        source_date: row.source_date,
        ocr_text: row.ocr_text,
        ocr_done: Boolean(row.ocr_done),
        ocr_status: row.ocr_status,
        created_at: row.created_at,
        ingested_at: row.ingested_at,
        updated_at: row.updated_at,
      };

      const result: SearchResult = { ...item };

      // Parse tags if they exist
      if (row.tag_names) {
        const tagNames = row.tag_names.split(',');
        const tagIds = row.tag_ids.split(',');
        const tagColors = row.tag_colors ? row.tag_colors.split(',') : [];
        
        result.tags = tagNames.map((name: string, index: number) => ({
          id: tagIds[index],
          name,
          color: tagColors[index] || undefined,
          created_at: '', // We don't have this in the query
          updated_at: '', // We don't have this in the query
        }));
      }

      // Calculate relevance score and matched fields if there's a query
      if (query.trim()) {
        const matchedFields: string[] = [];
        const expandedTerms = this.expandSearchQuery(query.trim());
        const queryLower = query.toLowerCase();

        // Check matches against all expanded terms
        expandedTerms.forEach(term => {
          const termLower = term.toLowerCase();
          
          if (item.title?.toLowerCase().includes(termLower)) {
            matchedFields.push('title');
          }
          if (item.description?.toLowerCase().includes(termLower)) {
            matchedFields.push('description');
          }
          if (item.ocr_text?.toLowerCase().includes(termLower)) {
            matchedFields.push('ocr_text');
          }
          if (item.content_url) {
            const domain = this.extractDomain(item.content_url);
            if (domain && domain.includes(termLower)) {
              matchedFields.push('domain');
            }
          }
          if (result.tags?.some(tag => tag.name.toLowerCase().includes(termLower))) {
            matchedFields.push('tags');
          }
        });

        // Remove duplicates
        result.matchedFields = [...new Set(matchedFields)];
        result.relevanceScore = this.calculateRelevanceScore(item, query, result.matchedFields);
      }

      return result;
    });

    // Sort by relevance score if there's a query, otherwise by creation date
    if (query.trim()) {
      processedResults.sort((a, b) => {
        const scoreA = a.relevanceScore || 0;
        const scoreB = b.relevanceScore || 0;
        if (scoreA !== scoreB) {
          return scoreB - scoreA; // Higher score first
        }
        // If scores are equal, sort by creation date
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    return processedResults;
  }

  /**
   * Get search suggestions based on existing data
   */
  static async getSearchSuggestions(query: string, limit: number = 10): Promise<string[]> {
    if (!query.trim() || query.length < 2) {
      return [];
    }

    const db = await getDatabase();
    const expandedTerms = this.expandSearchQuery(query.trim());
    const suggestions = new Set<string>();

    // Add expanded terms as suggestions
    expandedTerms.forEach(term => {
      if (term.toLowerCase() !== query.toLowerCase()) {
        suggestions.add(term);
      }
    });

    // Get title suggestions for each expanded term
    for (const term of expandedTerms.slice(0, 3)) { // Limit to first 3 terms to avoid too many queries
      const searchTerm = `%${term}%`;
      
      const titleResults = await db.getAllAsync<{ title: string }>(
        `SELECT DISTINCT title FROM ${TABLES.ITEMS} 
         WHERE title LIKE ? AND title IS NOT NULL
         ORDER BY created_at DESC
         LIMIT ?`,
        [searchTerm, Math.ceil(limit / 3)]
      );
      titleResults.forEach(row => suggestions.add(row.title));
    }

    // Get tag suggestions
    const searchTerm = `%${query.trim()}%`;
    const tagResults = await db.getAllAsync<{ name: string }>(
      `SELECT DISTINCT name FROM ${TABLES.TAGS} 
       WHERE name LIKE ?
       ORDER BY name ASC
       LIMIT ?`,
      [searchTerm, limit]
    );
    tagResults.forEach(row => suggestions.add(row.name));

    // Get domain suggestions from URLs
    const domainResults = await db.getAllAsync<{ content_url: string }>(
      `SELECT DISTINCT content_url FROM ${TABLES.ITEMS} 
       WHERE content_url LIKE ? AND content_url IS NOT NULL
       ORDER BY created_at DESC
       LIMIT ?`,
      [searchTerm, limit]
    );
    domainResults.forEach(row => {
      const domain = this.extractDomain(row.content_url);
      if (domain) {
        suggestions.add(domain);
      }
    });

    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * Get available filter options for the current dataset
   */
  static async getFilterOptions(): Promise<{
    sourceTypes: Source[];
    platforms: Platform[];
    tags: Tag[];
  }> {
    const db = await getDatabase();

    // Get unique source types
    const sourceResults = await db.getAllAsync<{ source: Source }>(
      `SELECT DISTINCT source FROM ${TABLES.ITEMS} WHERE source IS NOT NULL`
    );
    const sourceTypes = sourceResults.map(row => row.source);

    // Get unique platforms
    const platformResults = await db.getAllAsync<{ platform: Platform }>(
      `SELECT DISTINCT platform FROM ${TABLES.ITEMS} WHERE platform IS NOT NULL`
    );
    const platforms = platformResults.map(row => row.platform);

    // Get all tags
    const tags = await db.getAllAsync<Tag>(
      `SELECT * FROM ${TABLES.TAGS} ORDER BY name ASC`
    );

    return {
      sourceTypes,
      platforms,
      tags,
    };
  }

  /**
   * Get search statistics
   */
  static async getSearchStats(query: string, filters: SearchFilters = {}): Promise<{
    totalResults: number;
    resultsBySource: Record<Source, number>;
    resultsByPlatform: Record<Platform, number>;
  }> {
    const results = await this.search({ query, filters, limit: 1000 }); // Get more results for stats
    
    const stats = {
      totalResults: results.length,
      resultsBySource: {} as Record<Source, number>,
      resultsByPlatform: {} as Record<Platform, number>,
    };

    results.forEach(item => {
      // Count by source
      stats.resultsBySource[item.source] = (stats.resultsBySource[item.source] || 0) + 1;
      
      // Count by platform
      if (item.platform) {
        stats.resultsByPlatform[item.platform] = (stats.resultsByPlatform[item.platform] || 0) + 1;
      }
    });

    return stats;
  }
}
