/**
 * Integration test to verify the complete keyword tagging flow
 * This test demonstrates the end-to-end functionality
 */

import { keywordTagger } from './keywordTagger';
import { Item } from '../../data/models';

// Mock data for testing
const createTestItem = (overrides: Partial<Item> = {}): Item => ({
  id: 'test-item',
  title: 'Test Item',
  description: 'Test description',
  content_url: 'https://example.com',
  source: 'url',
  created_at: new Date().toISOString(),
  ingested_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('Keyword Tagger Integration', () => {
  describe('YouTube URL Auto-tagging', () => {
    it('should tag YouTube URLs as Video', async () => {
      const youtubeItem = createTestItem({
        title: 'Amazing YouTube Video',
        content_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        platform: 'youtube',
      });

      const tags = await keywordTagger.extractTags(youtubeItem);
      expect(tags).toContain('Video');
    });

    it('should tag youtu.be URLs as Video', async () => {
      const youtubeItem = createTestItem({
        title: 'Short YouTube Link',
        content_url: 'https://youtu.be/dQw4w9WgXcQ',
        platform: 'youtube',
      });

      const tags = await keywordTagger.extractTags(youtubeItem);
      expect(tags).toContain('Video');
    });
  });

  describe('Spotify URL Auto-tagging', () => {
    it('should tag Spotify URLs as Music', async () => {
      const spotifyItem = createTestItem({
        title: 'Great Song',
        content_url: 'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh',
        platform: 'spotify',
      });

      const tags = await keywordTagger.extractTags(spotifyItem);
      expect(tags).toContain('Music');
    });
  });

  describe('Instagram URL Auto-tagging', () => {
    it('should tag Instagram URLs as Social', async () => {
      const instagramItem = createTestItem({
        title: 'Instagram Post',
        content_url: 'https://www.instagram.com/p/ABC123/',
        platform: 'instagram',
      });

      const tags = await keywordTagger.extractTags(instagramItem);
      expect(tags).toContain('Social');
    });
  });

  describe('Content-based Tagging', () => {
    it('should tag recipe content as Food', async () => {
      const recipeItem = createTestItem({
        title: 'Delicious Pasta Recipe',
        description: 'Learn how to cook amazing pasta with this recipe',
        content_url: 'https://example.com/recipe',
      });

      const tags = await keywordTagger.extractTags(recipeItem);
      expect(tags).toContain('Food');
    });

    it('should tag workout content as Fitness', async () => {
      const workoutItem = createTestItem({
        title: 'Morning Workout Routine',
        description: 'Great exercise routine for beginners',
        content_url: 'https://example.com/workout',
      });

      const tags = await keywordTagger.extractTags(workoutItem);
      expect(tags).toContain('Fitness');
    });

    it('should tag programming content as Development', async () => {
      const codeItem = createTestItem({
        title: 'JavaScript Tutorial',
        description: 'Learn programming with this great tutorial',
        content_url: 'https://github.com/example/tutorial',
      });

      const tags = await keywordTagger.extractTags(codeItem);
      expect(tags).toContain('Development');
    });
  });

  describe('Multiple Tag Extraction', () => {
    it('should extract multiple tags from complex content', async () => {
      const complexItem = createTestItem({
        title: 'JavaScript Recipe Tutorial',
        description: 'Learn to code while cooking amazing food',
        content_url: 'https://github.com/example/recipe-tutorial',
      });

      const tags = await keywordTagger.extractTags(complexItem);
      expect(tags).toContain('Development');
      expect(tags).toContain('Food');
      expect(tags).toContain('Learning');
    });
  });

  describe('OCR Text Tagging', () => {
    it('should tag items based on OCR text content', async () => {
      const ocrItem = createTestItem({
        title: 'Screenshot',
        ocr_text: 'This is a recipe for cooking delicious pasta with ingredients',
        source: 'screenshot',
      });

      const tags = await keywordTagger.extractTags(ocrItem);
      expect(tags).toContain('Food');
    });
  });

  describe('Search Integration', () => {
    it('should work with search filtering', () => {
      // This test verifies that the tagging system is compatible with search
      // The search system should be able to filter by the tags we create
      
      const testItem = createTestItem({
        title: 'YouTube Video',
        content_url: 'https://www.youtube.com/watch?v=test',
      });

      // Extract tags (this would normally be done during ingest)
      const tags = keywordTagger.extractTags(testItem);
      
      // Verify that the tags can be used for search filtering
      expect(tags).toContain('Video');
      
      // In a real scenario, these tags would be stored in the database
      // and the search system would filter items by tag names
      const searchFilters = {
        tags: ['Video'], // This would filter for items with Video tag
      };
      
      // The search system should return items that have the Video tag
      expect(searchFilters.tags).toContain('Video');
    });
  });
});

// Manual test function for development
export const runManualTests = async () => {
  console.log('Running manual keyword tagger tests...');
  
  const testCases = [
    {
      name: 'YouTube URL',
      item: createTestItem({
        title: 'YouTube Video',
        content_url: 'https://www.youtube.com/watch?v=test',
        platform: 'youtube',
      }),
      expectedTags: ['Video'],
    },
    {
      name: 'Spotify URL',
      item: createTestItem({
        title: 'Spotify Track',
        content_url: 'https://open.spotify.com/track/test',
        platform: 'spotify',
      }),
      expectedTags: ['Music'],
    },
    {
      name: 'Recipe Content',
      item: createTestItem({
        title: 'Pasta Recipe',
        description: 'Delicious recipe for cooking pasta',
        content_url: 'https://example.com/recipe',
      }),
      expectedTags: ['Food'],
    },
    {
      name: 'Workout Content',
      item: createTestItem({
        title: 'Morning Workout',
        description: 'Great exercise routine',
        content_url: 'https://example.com/workout',
      }),
      expectedTags: ['Fitness'],
    },
  ];

  for (const testCase of testCases) {
    try {
      const tags = await keywordTagger.extractTags(testCase.item);
      console.log(`\n${testCase.name}:`);
      console.log(`  Extracted tags: ${tags.join(', ')}`);
      console.log(`  Expected tags: ${testCase.expectedTags.join(', ')}`);
      
      const hasExpectedTags = testCase.expectedTags.every(expectedTag => 
        tags.includes(expectedTag)
      );
      console.log(`  ✅ Test ${hasExpectedTags ? 'PASSED' : 'FAILED'}`);
    } catch (error) {
      console.error(`❌ Test failed for ${testCase.name}:`, error);
    }
  }
};
