import {
  KeywordTagger,
  keywordTagger,
  tagItemWithKeywords,
  tagItemsWithKeywords,
  getSuggestedTagsForItem,
  testKeywordMatching,
} from '../keywordTagger';
import { TagsRepository } from '../../../data/repositories/tags';
import { Item } from '../../../data/models';

// Mock the TagsRepository
jest.mock('../../../data/repositories/tags');
const mockTagsRepository = TagsRepository as jest.Mocked<typeof TagsRepository>;

describe('KeywordTagger', () => {
  let tagger: KeywordTagger;

  beforeEach(() => {
    jest.clearAllMocks();
    tagger = new KeywordTagger();
  });

  describe('constructor and configuration', () => {
    it('should initialize with default mappings', () => {
      const mappings = tagger.getMappings();
      expect(mappings).toHaveProperty('spotify');
      expect(mappings).toHaveProperty('youtube');
      expect(mappings).toHaveProperty('instagram');
    });

    it('should initialize with custom mappings', () => {
      const customMappings = {
        'custom': 'CustomTag',
        'test': 'TestTag',
      };
      const customTagger = new KeywordTagger(customMappings);
      
      const mappings = customTagger.getMappings();
      expect(mappings.custom).toBe('CustomTag');
      expect(mappings.test).toBe('TestTag');
      expect(mappings.spotify).toBe('Music'); // Should include defaults
    });

    it('should add new mappings', () => {
      const newMappings = {
        'newkeyword': 'NewTag',
        'another': 'AnotherTag',
      };

      tagger.addMappings(newMappings);
      const mappings = tagger.getMappings();

      expect(mappings.newkeyword).toBe('NewTag');
      expect(mappings.another).toBe('AnotherTag');
    });

    it('should remove mappings', () => {
      tagger.removeMappings(['spotify', 'youtube']);
      const mappings = tagger.getMappings();

      expect(mappings.spotify).toBeUndefined();
      expect(mappings.youtube).toBeUndefined();
      expect(mappings.instagram).toBe('Social'); // Should still exist
    });
  });

  describe('extractTags', () => {
    const mockItem: Item = {
      id: 'test-item',
      title: 'Check out this Spotify playlist',
      description: 'Great music for cooking dinner',
      content_url: 'https://spotify.com/playlist/123',
      source: 'url',
      platform: 'spotify',
      source_date: '2024-01-15T10:00:00.000Z',
      created_at: '2024-01-15T10:00:00.000Z',
      ingested_at: '2024-01-15T10:00:00.000Z',
      updated_at: '2024-01-15T10:00:00.000Z',
      ocr_done: false,
    };

    it('should extract tags from item content', async () => {
      const tags = await tagger.extractTags(mockItem);

      expect(tags).toContain('Music'); // from 'spotify'
      expect(tags).toContain('Food'); // from 'cooking'
      expect(tags).toContain('Food'); // from 'dinner'
    });

    it('should handle case-insensitive matching', async () => {
      const itemWithUpperCase = {
        ...mockItem,
        title: 'SPOTIFY PLAYLIST',
        description: 'COOKING RECIPE',
      };

      const tags = await tagger.extractTags(itemWithUpperCase);

      expect(tags).toContain('Music'); // from 'SPOTIFY'
      expect(tags).toContain('Food'); // from 'COOKING'
    });

    it('should avoid duplicate tags', async () => {
      const itemWithDuplicates = {
        ...mockItem,
        title: 'Cooking recipe for dinner',
        description: 'Great cooking tips for dinner preparation',
      };

      const tags = await tagger.extractTags(itemWithDuplicates);

      const foodTagCount = tags.filter(tag => tag === 'Food').length;
      expect(foodTagCount).toBe(1);
    });

    it('should extract tags from URL domain', async () => {
      const itemWithUrl = {
        ...mockItem,
        title: 'Check this out',
        description: 'Interesting content',
        content_url: 'https://github.com/user/repo',
      };

      const tags = await tagger.extractTags(itemWithUrl);

      expect(tags).toContain('Development'); // from 'github' in URL
    });

    it('should extract tags from URL path segments', async () => {
      const itemWithPath = {
        ...mockItem,
        title: 'API Documentation',
        description: 'Learn about APIs',
        content_url: 'https://example.com/api/documentation',
      };

      const tags = await tagger.extractTags(itemWithPath);

      expect(tags).toContain('Development'); // from 'api' in path
    });

    it('should extract tags from platform', async () => {
      const itemWithPlatform: Item = {
        ...mockItem,
        title: 'Video content',
        description: 'Watch this video',
        platform: 'youtube',
      };

      const tags = await tagger.extractTags(itemWithPlatform);

      expect(tags).toContain('Video'); // from platform 'youtube'
    });

    it('should return empty array when no keywords match', async () => {
      const itemWithoutKeywords: Item = {
        ...mockItem,
        title: 'Random content',
        description: 'No specific keywords here',
        content_url: 'https://example.com/page',
        platform: 'generic',
      };

      const tags = await tagger.extractTags(itemWithoutKeywords);

      expect(tags).toHaveLength(0);
    });

    it('should handle items with missing fields', async () => {
      const minimalItem: Item = {
        id: 'minimal-item',
        title: 'Spotify playlist',
        source: 'url',
        source_date: '2024-01-15T10:00:00.000Z',
        created_at: '2024-01-15T10:00:00.000Z',
        ingested_at: '2024-01-15T10:00:00.000Z',
        updated_at: '2024-01-15T10:00:00.000Z',
        ocr_done: false,
      };

      const tags = await tagger.extractTags(minimalItem);

      expect(tags).toContain('Music'); // from 'spotify' in title
    });
  });

  describe('tagItem', () => {
    const mockItem: Item = {
      id: 'test-item',
      title: 'Spotify playlist for cooking',
      description: 'Great music while cooking dinner',
      content_url: 'https://spotify.com/playlist/123',
      source: 'url',
      platform: 'spotify',
      source_date: '2024-01-15T10:00:00.000Z',
      created_at: '2024-01-15T10:00:00.000Z',
      ingested_at: '2024-01-15T10:00:00.000Z',
      updated_at: '2024-01-15T10:00:00.000Z',
      ocr_done: false,
    };

    it('should tag item successfully', async () => {
      mockTagsRepository.getOrCreate
        .mockResolvedValueOnce({ id: '1', name: 'Music', color: '#FF6B6B', created_at: '', updated_at: '' })
        .mockResolvedValueOnce({ id: '2', name: 'Food', color: '#4ECDC4', created_at: '', updated_at: '' })
        .mockResolvedValueOnce({ id: '3', name: 'Food', color: '#4ECDC4', created_at: '', updated_at: '' });
      mockTagsRepository.addTagToItem.mockResolvedValue(true);

      const result = await tagger.tagItem(mockItem);

      expect(result.success).toBe(true);
      expect(result.tagsAdded).toContain('Music');
      expect(result.tagsAdded).toContain('Food');
      expect(result.errors).toHaveLength(0);
      expect(mockTagsRepository.getOrCreate).toHaveBeenCalledTimes(3);
      expect(mockTagsRepository.addTagToItem).toHaveBeenCalledTimes(3);
    });

    it('should handle items with no matching keywords', async () => {
      const itemWithoutKeywords: Item = {
        id: 'test-item',
        title: 'Random content',
        description: 'No keywords here',
        content_url: 'https://example.com/page',
        source: 'url',
        platform: 'generic',
        source_date: '2024-01-15T10:00:00.000Z',
        created_at: '2024-01-15T10:00:00.000Z',
        ingested_at: '2024-01-15T10:00:00.000Z',
        updated_at: '2024-01-15T10:00:00.000Z',
        ocr_done: false,
      };

      const result = await tagger.tagItem(itemWithoutKeywords);

      expect(result.success).toBe(true);
      expect(result.tagsAdded).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(mockTagsRepository.getOrCreate).not.toHaveBeenCalled();
    });

    it('should handle tag creation errors', async () => {
      mockTagsRepository.getOrCreate.mockRejectedValue(new Error('Database error'));

      const result = await tagger.tagItem(mockItem);

      expect(result.success).toBe(false);
      expect(result.tagsAdded).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Failed to add tag');
    });

    it('should handle tag association errors', async () => {
      mockTagsRepository.getOrCreate.mockResolvedValue({ id: '1', name: 'Music', color: '#FF6B6B', created_at: '', updated_at: '' });
      mockTagsRepository.addTagToItem.mockRejectedValue(new Error('Association error'));

      const result = await tagger.tagItem(mockItem);

      expect(result.success).toBe(false);
      expect(result.tagsAdded).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should continue processing other tags when one fails', async () => {
      mockTagsRepository.getOrCreate
        .mockResolvedValueOnce({ id: '1', name: 'Music', color: '#FF6B6B', created_at: '', updated_at: '' })
        .mockResolvedValueOnce({ id: '2', name: 'Food', color: '#4ECDC4', created_at: '', updated_at: '' });
      mockTagsRepository.addTagToItem
        .mockResolvedValueOnce(true) // First tag succeeds
        .mockRejectedValueOnce(new Error('Second tag fails')); // Second tag fails

      const result = await tagger.tagItem(mockItem);

      expect(result.success).toBe(false);
      expect(result.tagsAdded).toContain('Music');
      expect(result.tagsAdded).not.toContain('Food');
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('tagItems', () => {
    const mockItems: Item[] = [
      {
        id: 'item-1',
        title: 'Spotify playlist',
        source: 'url',
        source_date: '2024-01-15T10:00:00.000Z',
        created_at: '2024-01-15T10:00:00.000Z',
        ingested_at: '2024-01-15T10:00:00.000Z',
        updated_at: '2024-01-15T10:00:00.000Z',
        ocr_done: false,
      },
      {
        id: 'item-2',
        title: 'Cooking recipe',
        source: 'url',
        source_date: '2024-01-15T10:00:00.000Z',
        created_at: '2024-01-15T10:00:00.000Z',
        ingested_at: '2024-01-15T10:00:00.000Z',
        updated_at: '2024-01-15T10:00:00.000Z',
        ocr_done: false,
      },
    ];

    it('should tag multiple items successfully', async () => {
      mockTagsRepository.getOrCreate
        .mockResolvedValue({ id: '1', name: 'Music', color: '#FF6B6B', created_at: '', updated_at: '' });
      mockTagsRepository.addTagToItem.mockResolvedValue(true);

      const result = await tagger.tagItems(mockItems);

      expect(result.success).toBe(true);
      expect(result.totalItems).toBe(2);
      expect(result.itemsTagged).toBe(2);
      expect(result.totalTagsAdded).toBe(3);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle partial failures in batch tagging', async () => {
      mockTagsRepository.getOrCreate
        .mockResolvedValueOnce({ id: '1', name: 'Music', color: '#FF6B6B', created_at: '', updated_at: '' })
        .mockRejectedValueOnce(new Error('Second item fails'));

      const result = await tagger.tagItems(mockItems);

      expect(result.success).toBe(false);
      expect(result.totalItems).toBe(2);
      expect(result.itemsTagged).toBe(1);
      expect(result.totalTagsAdded).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle empty items array', async () => {
      const result = await tagger.tagItems([]);

      expect(result.success).toBe(true);
      expect(result.totalItems).toBe(0);
      expect(result.itemsTagged).toBe(0);
      expect(result.totalTagsAdded).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('getSuggestedTags', () => {
    const mockItem: Item = {
      id: 'test-item',
      title: 'Spotify playlist for cooking',
      description: 'Great music while cooking dinner',
      content_url: 'https://spotify.com/playlist/123',
      source: 'url',
      platform: 'spotify',
      source_date: '2024-01-15T10:00:00.000Z',
      created_at: '2024-01-15T10:00:00.000Z',
      ingested_at: '2024-01-15T10:00:00.000Z',
      updated_at: '2024-01-15T10:00:00.000Z',
      ocr_done: false,
    };

    it('should return suggested tags without tagging the item', async () => {
      const suggestedTags = await tagger.getSuggestedTags(mockItem);

      expect(suggestedTags).toContain('Music');
      expect(suggestedTags).toContain('Food');
      expect(mockTagsRepository.getOrCreate).not.toHaveBeenCalled();
      expect(mockTagsRepository.addTagToItem).not.toHaveBeenCalled();
    });
  });

  describe('testKeywordMatching', () => {
    it('should test keyword matching on content', () => {
      const content = 'Check out this Spotify playlist for cooking dinner';
      const result = tagger.testKeywordMatching(content);

      expect(result.matchedKeywords).toContain('spotify');
      expect(result.matchedKeywords).toContain('cooking');
      expect(result.matchedKeywords).toContain('dinner');
      expect(result.suggestedTags).toContain('Music');
      expect(result.suggestedTags).toContain('Food');
    });

    it('should handle case-insensitive matching in test', () => {
      const content = 'SPOTIFY PLAYLIST FOR COOKING';
      const result = tagger.testKeywordMatching(content);

      expect(result.matchedKeywords).toContain('spotify');
      expect(result.matchedKeywords).toContain('cooking');
      expect(result.suggestedTags).toContain('Music');
      expect(result.suggestedTags).toContain('Food');
    });

    it('should return empty arrays for content with no matches', () => {
      const content = 'Random content with no keywords';
      const result = tagger.testKeywordMatching(content);

      expect(result.matchedKeywords).toHaveLength(0);
      expect(result.suggestedTags).toHaveLength(0);
    });
  });

  describe('utility functions', () => {
    const mockItem: Item = {
      id: 'test-item',
      title: 'Spotify playlist',
      source: 'url',
      source_date: '2024-01-15T10:00:00.000Z',
      created_at: '2024-01-15T10:00:00.000Z',
      ingested_at: '2024-01-15T10:00:00.000Z',
      updated_at: '2024-01-15T10:00:00.000Z',
      ocr_done: false,
    };

    it('should use default instance for tagItemWithKeywords', async () => {
      mockTagsRepository.getOrCreate.mockResolvedValue({ id: '1', name: 'Music', color: '#FF6B6B', created_at: '', updated_at: '' });
      mockTagsRepository.addTagToItem.mockResolvedValue(true);

      const result = await tagItemWithKeywords(mockItem);

      expect(result.success).toBe(true);
      expect(result.tagsAdded).toContain('Music');
    });

    it('should use default instance for getSuggestedTagsForItem', async () => {
      const suggestedTags = await getSuggestedTagsForItem(mockItem);

      expect(suggestedTags).toContain('Music');
    });

    it('should use default instance for testKeywordMatching', () => {
      const result = testKeywordMatching('Spotify playlist');

      expect(result.matchedKeywords).toContain('spotify');
      expect(result.suggestedTags).toContain('Music');
    });
  });

  describe('URL parsing edge cases', () => {
    it('should handle invalid URLs gracefully', async () => {
      const itemWithInvalidUrl: Item = {
        id: 'test-item',
        title: 'Test item',
        content_url: 'not-a-valid-url',
        source: 'url',
        source_date: '2024-01-15T10:00:00.000Z',
        created_at: '2024-01-15T10:00:00.000Z',
        ingested_at: '2024-01-15T10:00:00.000Z',
        updated_at: '2024-01-15T10:00:00.000Z',
        ocr_done: false,
      };

      const tags = await tagger.extractTags(itemWithInvalidUrl);

      // Should not crash and should still process the raw URL
      expect(Array.isArray(tags)).toBe(true);
    });

    it('should handle URLs with complex paths', async () => {
      const itemWithComplexUrl: Item = {
        id: 'test-item',
        title: 'API Documentation',
        content_url: 'https://github.com/user/repo/blob/main/api/documentation.md',
        source: 'url',
        source_date: '2024-01-15T10:00:00.000Z',
        created_at: '2024-01-15T10:00:00.000Z',
        ingested_at: '2024-01-15T10:00:00.000Z',
        updated_at: '2024-01-15T10:00:00.000Z',
        ocr_done: false,
      };

      const tags = await tagger.extractTags(itemWithComplexUrl);

      expect(tags).toContain('Development'); // from 'github' and 'api'
    });
  });
});
