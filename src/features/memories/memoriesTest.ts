import { getMemoriesWindows, selectMemories, groupMemoriesByPattern, createTestMemoriesSettings } from './selectMemories';
import { TABLES } from '../../data/models';
import { getDatabase, generateId, getCurrentTimestamp } from '../../data/db';

/**
 * Test the memories system with sample data
 */
export async function testMemoriesSystem(): Promise<void> {
  console.log('🧪 Testing Memories System...');
  
  try {
    const database = await getDatabase();
    const settings = createTestMemoriesSettings();
    
    // Create test data
    await createTestData(database);
    
    // Test window computation
    const today = new Date();
    const windows = getMemoriesWindows(today, settings);
    console.log(`📅 Generated ${windows.length} memory windows`);
    
    // Test memory selection
    const memories = await selectMemories(windows, settings);
    console.log(`🎯 Found ${memories.length} memories`);
    
    // Test grouping
    const grouped = groupMemoriesByPattern(memories);
    console.log(`📊 Grouped memories:`, {
      yearly: Object.keys(grouped.yearly).length,
      monthly: Object.keys(grouped.monthly).length
    });
    
    // Log detailed results
    logTestResults(memories, grouped);
    
    // Clean up test data
    await cleanupTestData(database);
    
    console.log('✅ Memories system test completed successfully');
    
  } catch (error) {
    console.error('❌ Memories system test failed:', error);
    throw error;
  }
}

/**
 * Creates test data for verification
 */
async function createTestData(database: any): Promise<void> {
  console.log('📝 Creating test data...');
  
  const now = new Date();
  const testItems = [
    // Screenshot taken exactly 6 months ago
    {
      id: generateId(),
      title: 'Test Screenshot - 6 months ago',
      source: 'screenshot',
      platform: 'generic',
      source_date: new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()).toISOString(),
      ocr_done: 1,
      ocr_status: 'done',
      created_at: getCurrentTimestamp(),
      ingested_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp(),
    },
    
    // Instagram saved on this date 3 years ago
    {
      id: generateId(),
      title: 'Test Instagram - 3 years ago',
      source: 'url',
      platform: 'instagram',
      source_date: new Date(now.getFullYear() - 3, now.getMonth(), now.getDate()).toISOString(),
      content_url: 'https://instagram.com/test',
      ocr_done: 1,
      ocr_status: 'done',
      created_at: getCurrentTimestamp(),
      ingested_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp(),
    },
    
    // Edge bookmark saved ~2 days around target date (4 months ago)
    {
      id: generateId(),
      title: 'Test Bookmark - 4 months ago +2 days',
      source: 'url',
      platform: 'generic',
      source_date: new Date(now.getFullYear(), now.getMonth() - 4, now.getDate() + 2).toISOString(),
      content_url: 'https://example.com/bookmark',
      ocr_done: 1,
      ocr_status: 'done',
      created_at: getCurrentTimestamp(),
      ingested_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp(),
    },
    
    // YouTube video from 2 months ago
    {
      id: generateId(),
      title: 'Test YouTube - 2 months ago',
      source: 'url',
      platform: 'youtube',
      source_date: new Date(now.getFullYear(), now.getMonth() - 2, now.getDate()).toISOString(),
      content_url: 'https://youtube.com/watch?v=test',
      ocr_done: 1,
      ocr_status: 'done',
      created_at: getCurrentTimestamp(),
      ingested_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp(),
    },
    
    // Item without source_date (should be excluded unless fallback is enabled)
    {
      id: generateId(),
      title: 'Test Item - No source date',
      source: 'url',
      platform: 'generic',
      source_date: null,
      content_url: 'https://example.com/no-date',
      ocr_done: 1,
      ocr_status: 'done',
      created_at: getCurrentTimestamp(),
      ingested_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp(),
    },
  ];
  
  for (const item of testItems) {
    await database.runAsync(
      `INSERT INTO ${TABLES.ITEMS} (id, title, source, platform, source_date, content_url, ocr_done, ocr_status, created_at, ingested_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.title,
        item.source,
        item.platform,
        item.source_date,
        item.content_url,
        item.ocr_done,
        item.ocr_status,
        item.created_at,
        item.ingested_at,
        item.updated_at,
      ]
    );
  }
  
  console.log(`✅ Created ${testItems.length} test items`);
}

/**
 * Logs detailed test results
 */
function logTestResults(memories: any[], grouped: any): void {
  console.log('\n📋 Test Results:');
  
  if (memories.length === 0) {
    console.log('❌ No memories found - this might indicate an issue');
    return;
  }
  
  console.log(`\n🎯 Found ${memories.length} memories:`);
  memories.forEach((memory, index) => {
    console.log(`  ${index + 1}. ${memory.title}`);
    console.log(`     Pattern: ${memory.memoryPattern}`);
    console.log(`     Source Date: ${memory.source_date}`);
    console.log(`     Days Ago: ${memory.daysAgo}`);
    if (memory.memoryInterval) {
      console.log(`     Interval: ${memory.memoryInterval} months`);
    }
    if (memory.memoryYear) {
      console.log(`     Year: ${memory.memoryYear}`);
    }
    console.log('');
  });
  
  console.log('\n📊 Grouped Results:');
  
  if (Object.keys(grouped.yearly).length > 0) {
    console.log('  📅 Yearly Memories:');
    Object.entries(grouped.yearly).forEach(([year, yearMemories]: [string, any]) => {
      console.log(`    ${year}: ${yearMemories.length} memories`);
    });
  }
  
  if (Object.keys(grouped.monthly).length > 0) {
    console.log('  📆 Monthly Memories:');
    Object.entries(grouped.monthly).forEach(([interval, intervalMemories]: [string, any]) => {
      console.log(`    ${interval}: ${intervalMemories.length} memories`);
    });
  }
  
  // Verify expected results
  console.log('\n✅ Verification:');
  
  const hasScreenshot6Months = memories.some(m => 
    m.title.includes('6 months ago') && m.memoryPattern === 'monthly' && m.memoryInterval === 6
  );
  console.log(`  Screenshot 6 months ago: ${hasScreenshot6Months ? '✅ Found' : '❌ Missing'}`);
  
  const hasInstagram3Years = memories.some(m => 
    m.title.includes('3 years ago') && m.memoryPattern === 'yearly' && m.memoryYear === new Date().getFullYear() - 3
  );
  console.log(`  Instagram 3 years ago: ${hasInstagram3Years ? '✅ Found' : '❌ Missing'}`);
  
  const hasBookmark4Months = memories.some(m => 
    m.title.includes('4 months ago') && m.memoryPattern === 'monthly' && m.memoryInterval === 4
  );
  console.log(`  Bookmark 4 months ago: ${hasBookmark4Months ? '✅ Found' : '❌ Missing'}`);
  
  const hasYouTube2Months = memories.some(m => 
    m.title.includes('2 months ago') && m.memoryPattern === 'monthly' && m.memoryInterval === 2
  );
  console.log(`  YouTube 2 months ago: ${hasYouTube2Months ? '✅ Found' : '❌ Missing'}`);
  
  const hasNoSourceDate = memories.some(m => m.title.includes('No source date'));
  console.log(`  Item without source_date: ${hasNoSourceDate ? '✅ Found (fallback enabled)' : '❌ Missing (as expected)'}`);
}

/**
 * Cleans up test data
 */
async function cleanupTestData(database: any): Promise<void> {
  console.log('🧹 Cleaning up test data...');
  
  await database.runAsync(
    `DELETE FROM ${TABLES.ITEMS} WHERE title LIKE 'Test %'`
  );
  
  console.log('✅ Test data cleaned up');
}

/**
 * Run the test from the console
 */
export async function runMemoriesTest(): Promise<void> {
  try {
    await testMemoriesSystem();
  } catch (error) {
    console.error('Test failed:', error);
  }
}
