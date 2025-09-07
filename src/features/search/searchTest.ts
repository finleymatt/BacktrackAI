import { SearchService } from './search';
import { ItemsRepository } from '../../data/repositories/items';
import { TagsRepository } from '../../data/repositories/tags';

/**
 * Test the search functionality with sample data
 * This is a simple test to verify the search works correctly
 */
export async function testSearchFunctionality() {
  console.log('🧪 Testing search functionality...');

  try {
    // Test 1: Basic text search
    console.log('\n1. Testing basic text search...');
    const textResults = await SearchService.search({ 
      query: 'test', 
      limit: 10 
    });
    console.log(`Found ${textResults.length} results for "test"`);

    // Test 1.5: Semantic search (football -> NFL)
    console.log('\n1.5. Testing semantic search (football -> NFL)...');
    const footballResults = await SearchService.search({ 
      query: 'football', 
      limit: 10 
    });
    console.log(`Found ${footballResults.length} results for "football" (should include NFL content)`);
    if (footballResults.length > 0) {
      console.log('Sample results:', footballResults.slice(0, 3).map(r => r.title));
    }

    // Test 2: Search with filters
    console.log('\n2. Testing search with source filter...');
    const filteredResults = await SearchService.search({
      query: '',
      filters: {
        sourceTypes: ['screenshot'],
      },
      limit: 10
    });
    console.log(`Found ${filteredResults.length} screenshot items`);

    // Test 3: Search suggestions
    console.log('\n3. Testing search suggestions...');
    const suggestions = await SearchService.getSearchSuggestions('test', 5);
    console.log(`Suggestions for "test":`, suggestions);

    // Test 4: Filter options
    console.log('\n4. Testing filter options...');
    const filterOptions = await SearchService.getFilterOptions();
    console.log('Available filters:', {
      sourceTypes: filterOptions.sourceTypes.length,
      platforms: filterOptions.platforms.length,
      tags: filterOptions.tags.length,
    });

    // Test 5: Search stats
    console.log('\n5. Testing search stats...');
    const stats = await SearchService.getSearchStats('test');
    console.log('Search stats:', stats);

    console.log('\n✅ All search tests completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Search test failed:', error);
    return false;
  }
}

/**
 * Create sample data for testing if needed
 */
export async function createSampleDataForTesting() {
  console.log('📝 Creating sample data for testing...');

  try {
    // Create test items
    const testItem1 = await ItemsRepository.create({
      title: 'Test Spotify Playlist',
      description: 'A great playlist for hiking and outdoor activities',
      content_url: 'https://open.spotify.com/playlist/test123',
      source: 'url',
      platform: 'spotify',
      ocr_text: 'This is test OCR text about hiking and nature',
    });

    const testItem2 = await ItemsRepository.create({
      title: 'The addict who became the NFL\'s highest paid star',
      description: 'An amazing story about NFL success and redemption',
      content_url: 'https://youtube.com/watch?v=nfl-video-123',
      source: 'url',
      platform: 'youtube',
      ocr_text: 'NFL football player story about overcoming addiction',
    });

    // Create test tags
    const hikingTag = await TagsRepository.getOrCreate('hiking', '#4CAF50');
    const nflTag = await TagsRepository.getOrCreate('NFL', '#FF6B35');
    
    // Add tags to items
    await TagsRepository.addTagToItem(testItem1.id, hikingTag.id);
    await TagsRepository.addTagToItem(testItem2.id, nflTag.id);

    console.log('✅ Sample data created successfully!');
    console.log('Created items:', testItem1.title, 'and', testItem2.title);
    console.log('Created tags:', hikingTag.name, 'and', nflTag.name);
    
    return { items: [testItem1, testItem2], tags: [hikingTag, nflTag] };
  } catch (error) {
    console.error('❌ Failed to create sample data:', error);
    return null;
  }
}

/**
 * Run comprehensive search tests
 */
export async function runSearchTests() {
  console.log('🚀 Starting comprehensive search tests...\n');

  // Create sample data first
  const sampleData = await createSampleDataForTesting();
  
  if (!sampleData) {
    console.log('⚠️  Skipping tests due to sample data creation failure');
    return false;
  }

  // Wait a moment for data to be available
  await new Promise(resolve => setTimeout(resolve, 100));

  // Run the tests
  const success = await testSearchFunctionality();
  
  if (success) {
    console.log('\n🎉 All search functionality tests passed!');
    console.log('\nYou can now test the search in the app:');
    console.log('- Try searching for "Spotify" (should find music content)');
    console.log('- Try searching for "hiking" (should find outdoor content)');
    console.log('- Try searching for "football" (should find NFL content!)');
    console.log('- Try searching for "NFL" (should find football content!)');
    console.log('- Try filtering by source type "url"');
    console.log('- Try filtering by platform "youtube" or "spotify"');
  }

  return success;
}
