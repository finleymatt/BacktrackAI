import { KeywordTagger } from './keywordTagger';
import { Item } from '../../data/models';

// Mock the TagsRepository to avoid database dependencies in tests
jest.mock('../../data/repositories/tags', () => ({
  TagsRepository: {
    getOrCreate: jest.fn().mockImplementation((name: string) => 
      Promise.resolve({ id: `tag-${name}`, name, color: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    ),
    addTagToItem: jest.fn().mockResolvedValue(true),
  }
}));

describe('KeywordTagger', () => {
  let tagger: KeywordTagger;

  beforeEach(() => {
    tagger = new KeywordTagger();
  });

  describe('extractTags', () => {
    it('should tag YouTube URLs as Video', async () => {
      const item: Item = {
        id: 'test-item-1',
        title: 'Amazing YouTube Video',
        description: 'Check out this cool video',
        content_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        source: 'url',
        platform: 'youtube',
        created_at: new Date().toISOString(),
        ingested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const tags = await tagger.extractTags(item);
      expect(tags).toContain('Video');
    });

    it('should tag Spotify URLs as Music', async () => {
      const item: Item = {
        id: 'test-item-2',
        title: 'Great Song',
        description: 'Listen to this track',
        content_url: 'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh',
        source: 'url',
        platform: 'spotify',
        created_at: new Date().toISOString(),
        ingested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const tags = await tagger.extractTags(item);
      expect(tags).toContain('Music');
    });

    it('should tag Instagram URLs as Social', async () => {
      const item: Item = {
        id: 'test-item-3',
        title: 'Instagram Post',
        description: 'Check out this post',
        content_url: 'https://www.instagram.com/p/ABC123/',
        source: 'url',
        platform: 'instagram',
        created_at: new Date().toISOString(),
        ingested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const tags = await tagger.extractTags(item);
      expect(tags).toContain('Social');
    });

    it('should tag items with recipe content as Food', async () => {
      const item: Item = {
        id: 'test-item-4',
        title: 'Delicious Recipe',
        description: 'How to make the best pasta recipe',
        content_url: 'https://example.com/recipe',
        source: 'url',
        created_at: new Date().toISOString(),
        ingested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const tags = await tagger.extractTags(item);
      expect(tags).toContain('Food');
    });

    it('should tag items with workout content as Fitness', async () => {
      const item: Item = {
        id: 'test-item-5',
        title: 'Morning Workout',
        description: 'Great exercise routine for beginners',
        content_url: 'https://example.com/workout',
        source: 'url',
        created_at: new Date().toISOString(),
        ingested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const tags = await tagger.extractTags(item);
      expect(tags).toContain('Fitness');
    });

    it('should extract multiple tags from complex content', async () => {
      const item: Item = {
        id: 'test-item-6',
        title: 'JavaScript Tutorial for Beginners',
        description: 'Learn programming with this great tutorial',
        content_url: 'https://github.com/example/tutorial',
        source: 'url',
        platform: 'generic',
        created_at: new Date().toISOString(),
        ingested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const tags = await tagger.extractTags(item);
      expect(tags).toContain('Development');
      expect(tags).toContain('Learning');
    });

    it('should handle items with no matching keywords', async () => {
      const item: Item = {
        id: 'test-item-7',
        title: 'Random Content',
        description: 'Some random text without keywords',
        content_url: 'https://example.com/random',
        source: 'url',
        created_at: new Date().toISOString(),
        ingested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const tags = await tagger.extractTags(item);
      expect(tags).toHaveLength(0);
    });
  });

  describe('testKeywordMatching', () => {
    it('should match keywords in content', () => {
      const content = 'Check out this amazing recipe for cooking delicious food';
      const result = tagger.testKeywordMatching(content);
      
      expect(result.matchedKeywords).toContain('recipe');
      expect(result.matchedKeywords).toContain('cooking');
      expect(result.matchedKeywords).toContain('food');
      expect(result.suggestedTags).toContain('Food');
    });

    it('should be case insensitive', () => {
      const content = 'YOUTUBE VIDEO TUTORIAL';
      const result = tagger.testKeywordMatching(content);
      
      expect(result.matchedKeywords).toContain('youtube');
      expect(result.suggestedTags).toContain('Video');
    });
  });

  describe('custom mappings', () => {
    it('should use custom keyword mappings', () => {
      const customTagger = new KeywordTagger({
        'custom': 'CustomTag',
        'special': 'SpecialTag',
      });

      const content = 'This is a custom special content';
      const result = customTagger.testKeywordMatching(content);
      
      expect(result.matchedKeywords).toContain('custom');
      expect(result.matchedKeywords).toContain('special');
      expect(result.suggestedTags).toContain('CustomTag');
      expect(result.suggestedTags).toContain('SpecialTag');
    });

    it('should merge custom mappings with default ones', () => {
      const customTagger = new KeywordTagger({
        'custom': 'CustomTag',
      });

      const content = 'youtube custom content';
      const result = customTagger.testKeywordMatching(content);
      
      expect(result.matchedKeywords).toContain('youtube');
      expect(result.matchedKeywords).toContain('custom');
      expect(result.suggestedTags).toContain('Video');
      expect(result.suggestedTags).toContain('CustomTag');
    });
  });
});
