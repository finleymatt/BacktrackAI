import { SearchService } from '../search';
import { getDatabase } from '../../../data/db';
import { Item, Source, Platform } from '../../../data/models';

// Mock the database
jest.mock('../../../data/db');
const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

describe('SearchService', () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDb = {
      getAllAsync: jest.fn(),
    };
    mockGetDatabase.mockResolvedValue(mockDb);
  });

  describe('search', () => {
    const mockItems = [
      {
        id: '1',
        title: 'Instagram Post',
        description: 'A beautiful sunset photo',
        content_url: 'https://instagram.com/p/123',
        thumbnail_url: 'https://instagram.com/thumb.jpg',
        source: 'screenshot',
        platform: 'instagram',
        source_date: '2024-01-15T10:00:00.000Z',
        ocr_text: 'Instagram @username • 2h',
        ocr_done: true,
        ocr_status: 'completed',
        created_at: '2024-01-15T10:00:00.000Z',
        ingested_at: '2024-01-15T10:00:00.000Z',
        updated_at: '2024-01-15T10:00:00.000Z',
        tag_names: 'Social,Photo',
        tag_ids: '1,2',
        tag_colors: '#FF6B6B,#4ECDC4',
      },
      {
        id: '2',
        title: 'YouTube Video',
        description: 'How to cook pasta',
        content_url: 'https://youtube.com/watch?v=123',
        thumbnail_url: 'https://youtube.com/thumb.jpg',
        source: 'url',
        platform: 'youtube',
        source_date: '2024-01-14T10:00:00.000Z',
        ocr_text: null,
        ocr_done: false,
        ocr_status: null,
        created_at: '2024-01-14T10:00:00.000Z',
        ingested_at: '2024-01-14T10:00:00.000Z',
        updated_at: '2024-01-14T10:00:00.000Z',
        tag_names: 'Video,Cooking',
        tag_ids: '3,4',
        tag_colors: '#FF6B6B,#4ECDC4',
      },
    ];

    it('should perform basic search without filters', async () => {
      mockDb.getAllAsync.mockResolvedValue(mockItems);

      const results = await SearchService.search({ query: 'instagram' });

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('relevanceScore');
      expect(results[0]).toHaveProperty('matchedFields');
      expect(results[0]).toHaveProperty('tags');
      expect(mockDb.getAllAsync).toHaveBeenCalled();
    });

    it('should search with source type filter', async () => {
      mockDb.getAllAsync.mockResolvedValue([mockItems[0]]);

      const results = await SearchService.search({
        query: 'instagram',
        filters: { sourceTypes: ['screenshot'] },
      });

      expect(results).toHaveLength(1);
      expect(results[0].source).toBe('screenshot');
    });

    it('should search with platform filter', async () => {
      mockDb.getAllAsync.mockResolvedValue([mockItems[1]]);

      const results = await SearchService.search({
        query: 'youtube',
        filters: { platforms: ['youtube'] },
      });

      expect(results).toHaveLength(1);
      expect(results[0].platform).toBe('youtube');
    });

    it('should search with date range filter', async () => {
      mockDb.getAllAsync.mockResolvedValue(mockItems);

      const results = await SearchService.search({
        query: 'test',
        filters: {
          dateRange: {
            start: '2024-01-14T00:00:00.000Z',
            end: '2024-01-15T23:59:59.999Z',
          },
        },
      });

      expect(results).toHaveLength(2);
    });

    it('should search with tag filter', async () => {
      mockDb.getAllAsync.mockResolvedValue([mockItems[0]]);

      const results = await SearchService.search({
        query: 'test',
        filters: { tags: ['Social'] },
      });

      expect(results).toHaveLength(1);
    });

    it('should expand search query with keywords', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await SearchService.search({ query: 'football' });

      // Should search for football and related terms like NFL, american football, etc.
      const callArgs = mockDb.getAllAsync.mock.calls[0];
      expect(callArgs[0]).toContain('football');
    });

    it('should calculate relevance scores correctly', async () => {
      mockDb.getAllAsync.mockResolvedValue(mockItems);

      const results = await SearchService.search({ query: 'Instagram' });

      expect(results[0].relevanceScore).toBeGreaterThan(0);
      expect(results[0].matchedFields).toContain('title');
    });

    it('should sort results by relevance score', async () => {
      const itemsWithScores = [
        { ...mockItems[0], relevanceScore: 5 },
        { ...mockItems[1], relevanceScore: 10 },
      ];
      mockDb.getAllAsync.mockResolvedValue(itemsWithScores);

      const results = await SearchService.search({ query: 'test' });

      expect(results[0].relevanceScore || 0).toBeGreaterThanOrEqual(results[1].relevanceScore || 0);
    });

    it('should handle empty search results', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      const results = await SearchService.search({ query: 'nonexistent' });

      expect(results).toHaveLength(0);
    });

    it('should respect limit and offset parameters', async () => {
      mockDb.getAllAsync.mockResolvedValue(mockItems);

      await SearchService.search({ query: 'test', limit: 1, offset: 1 });

      const callArgs = mockDb.getAllAsync.mock.calls[0];
      expect(callArgs[1]).toContain(1); // limit
      expect(callArgs[1]).toContain(1); // offset
    });
  });

  describe('getSearchSuggestions', () => {
    it('should return empty array for short queries', async () => {
      const suggestions = await SearchService.getSearchSuggestions('a');

      expect(suggestions).toHaveLength(0);
    });

    it('should return search suggestions', async () => {
      mockDb.getAllAsync
        .mockResolvedValueOnce([{ title: 'Instagram Post' }]) // title results
        .mockResolvedValueOnce([{ name: 'Social' }]) // tag results
        .mockResolvedValueOnce([{ content_url: 'https://instagram.com/p/123' }]); // domain results

      const suggestions = await SearchService.getSearchSuggestions('insta');

      expect(suggestions.length).toBeGreaterThan(0);
      expect(mockDb.getAllAsync).toHaveBeenCalledTimes(3);
    });

    it('should limit suggestions to specified limit', async () => {
      mockDb.getAllAsync
        .mockResolvedValueOnce([{ title: 'Test 1' }, { title: 'Test 2' }])
        .mockResolvedValueOnce([{ name: 'Tag1' }])
        .mockResolvedValueOnce([]);

      const suggestions = await SearchService.getSearchSuggestions('test', 3);

      expect(suggestions.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getFilterOptions', () => {
    it('should return available filter options', async () => {
      mockDb.getAllAsync
        .mockResolvedValueOnce([{ source: 'screenshot' }, { source: 'url' }]) // source types
        .mockResolvedValueOnce([{ platform: 'instagram' }, { platform: 'youtube' }]) // platforms
        .mockResolvedValueOnce([{ id: '1', name: 'Social', color: '#FF6B6B', created_at: '', updated_at: '' }]); // tags

      const options = await SearchService.getFilterOptions();

      expect(options.sourceTypes).toContain('screenshot');
      expect(options.sourceTypes).toContain('url');
      expect(options.platforms).toContain('instagram');
      expect(options.platforms).toContain('youtube');
      expect(options.tags).toHaveLength(1);
    });
  });

  describe('getSearchStats', () => {
    it('should return search statistics', async () => {
      const mockResults = [
        { source: 'screenshot', platform: 'instagram' },
        { source: 'url', platform: 'youtube' },
        { source: 'screenshot', platform: 'instagram' },
      ];

      // Mock the search method to return our test results
      jest.spyOn(SearchService, 'search').mockResolvedValue(mockResults as any);

      const stats = await SearchService.getSearchStats('test');

      expect(stats.totalResults).toBe(3);
      expect(stats.resultsBySource.screenshot).toBe(2);
      expect(stats.resultsBySource.url).toBe(1);
      expect(stats.resultsByPlatform.instagram).toBe(2);
      expect(stats.resultsByPlatform.youtube).toBe(1);
    });
  });

  describe('keyword expansion', () => {
    it('should expand sports-related keywords', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await SearchService.search({ query: 'football' });

      const callArgs = mockDb.getAllAsync.mock.calls[0];
      const query = callArgs[0];
      expect(query).toContain('NFL');
      expect(query).toContain('american football');
    });

    it('should expand music-related keywords', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await SearchService.search({ query: 'music' });

      const callArgs = mockDb.getAllAsync.mock.calls[0];
      const query = callArgs[0];
      expect(query).toContain('song');
      expect(query).toContain('album');
      expect(query).toContain('artist');
    });

    it('should expand programming-related keywords', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await SearchService.search({ query: 'programming' });

      const callArgs = mockDb.getAllAsync.mock.calls[0];
      const query = callArgs[0];
      expect(query).toContain('coding');
      expect(query).toContain('developer');
      expect(query).toContain('javascript');
    });
  });

  describe('domain extraction', () => {
    it('should extract domain from URL correctly', async () => {
      const itemsWithUrls = [
        {
          id: '1',
          title: 'Instagram Post',
          description: 'A beautiful sunset photo',
          content_url: 'https://www.instagram.com/p/123',
          thumbnail_url: 'https://instagram.com/thumb.jpg',
          source: 'screenshot',
          platform: 'instagram',
          source_date: '2024-01-15T10:00:00.000Z',
          ocr_text: 'Instagram @username • 2h',
          ocr_done: true,
          ocr_status: 'completed',
          created_at: '2024-01-15T10:00:00.000Z',
          ingested_at: '2024-01-15T10:00:00.000Z',
          updated_at: '2024-01-15T10:00:00.000Z',
          tag_names: 'Social,Photo',
          tag_ids: '1,2',
          tag_colors: '#FF6B6B,#4ECDC4',
        },
      ];
      mockDb.getAllAsync.mockResolvedValue(itemsWithUrls);

      const results = await SearchService.search({ query: 'instagram.com' });

      expect(results[0].matchedFields).toContain('domain');
    });

    it('should handle invalid URLs gracefully', async () => {
      const itemsWithInvalidUrls = [
        {
          id: '1',
          title: 'Instagram Post',
          description: 'A beautiful sunset photo',
          content_url: 'not-a-valid-url',
          thumbnail_url: 'https://instagram.com/thumb.jpg',
          source: 'screenshot',
          platform: 'instagram',
          source_date: '2024-01-15T10:00:00.000Z',
          ocr_text: 'Instagram @username • 2h',
          ocr_done: true,
          ocr_status: 'completed',
          created_at: '2024-01-15T10:00:00.000Z',
          ingested_at: '2024-01-15T10:00:00.000Z',
          updated_at: '2024-01-15T10:00:00.000Z',
          tag_names: 'Social,Photo',
          tag_ids: '1,2',
          tag_colors: '#FF6B6B,#4ECDC4',
        },
      ];
      mockDb.getAllAsync.mockResolvedValue(itemsWithInvalidUrls);

      const results = await SearchService.search({ query: 'test' });

      expect(results).toHaveLength(1);
      expect(results[0].matchedFields).not.toContain('domain');
    });
  });
});
