import { getDatabase } from '../../data/db';
import { TABLES } from '../../data/models';
import { ItemsRepository } from '../../data/repositories/items';

/**
 * Debug utility to check current data and create test memories
 */
export async function debugMemoriesData(): Promise<void> {
  console.log('🔍 Debugging Memories Data...');
  
  try {
    const database = await getDatabase();
    
    // Check total items
    const totalItems = await database.getFirstAsync(`SELECT COUNT(*) as count FROM ${TABLES.ITEMS}`);
    console.log(`📊 Total items in database: ${totalItems?.count || 0}`);
    
    // Check items with source_date
    const itemsWithSourceDate = await database.getFirstAsync(
      `SELECT COUNT(*) as count FROM ${TABLES.ITEMS} WHERE source_date IS NOT NULL`
    );
    console.log(`📅 Items with source_date: ${itemsWithSourceDate?.count || 0}`);
    
    // Check items without source_date
    const itemsWithoutSourceDate = await database.getFirstAsync(
      `SELECT COUNT(*) as count FROM ${TABLES.ITEMS} WHERE source_date IS NULL`
    );
    console.log(`❌ Items without source_date: ${itemsWithoutSourceDate?.count || 0}`);
    
    // Show sample items
    const sampleItems = await database.getAllAsync(
      `SELECT id, title, source, platform, source_date, created_at, ingested_at 
       FROM ${TABLES.ITEMS} 
       ORDER BY created_at DESC 
       LIMIT 5`
    );
    
    console.log('\n📋 Sample items:');
    sampleItems.forEach((item: any, index: number) => {
      console.log(`  ${index + 1}. ${item.title}`);
      console.log(`     Source: ${item.source}, Platform: ${item.platform || 'none'}`);
      console.log(`     Source Date: ${item.source_date || 'NULL'}`);
      console.log(`     Created: ${item.created_at}`);
      console.log('');
    });
    
    // If no items with source_date, offer to create test data
    if ((itemsWithSourceDate?.count || 0) === 0) {
      console.log('⚠️ No items with source_date found. Would you like to create test data?');
      console.log('Run: createTestMemoriesData()');
    }
    
  } catch (error) {
    console.error('❌ Error debugging memories data:', error);
  }
}

/**
 * Creates test data with proper source dates for memories testing
 */
export async function createTestMemoriesData(): Promise<void> {
  console.log('📝 Creating test memories data...');
  
  try {
    const now = new Date();
    
    // Create test items with various source dates
    const testItems = [
      {
        title: 'Test Screenshot - 6 months ago',
        description: 'A test screenshot from 6 months ago',
        source: 'screenshot' as const,
        platform: 'generic' as const,
        source_date: new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()).toISOString(),
        content_url: 'file://test-screenshot-6m.jpg',
      },
      {
        title: 'Test Instagram - 3 years ago',
        description: 'A test Instagram post from 3 years ago',
        source: 'url' as const,
        platform: 'instagram' as const,
        source_date: new Date(now.getFullYear() - 3, now.getMonth(), now.getDate()).toISOString(),
        content_url: 'https://instagram.com/p/test-3y',
      },
      {
        title: 'Test YouTube - 2 months ago',
        description: 'A test YouTube video from 2 months ago',
        source: 'url' as const,
        platform: 'youtube' as const,
        source_date: new Date(now.getFullYear(), now.getMonth() - 2, now.getDate()).toISOString(),
        content_url: 'https://youtube.com/watch?v=test-2m',
      },
      {
        title: 'Test Bookmark - 4 months ago +2 days',
        description: 'A test bookmark from 4 months ago (with +2 day offset)',
        source: 'url' as const,
        platform: 'generic' as const,
        source_date: new Date(now.getFullYear(), now.getMonth() - 4, now.getDate() + 2).toISOString(),
        content_url: 'https://example.com/bookmark-4m',
      },
      {
        title: 'Test Photo - 8 months ago',
        description: 'A test photo from 8 months ago',
        source: 'photo_scan' as const,
        platform: 'generic' as const,
        source_date: new Date(now.getFullYear(), now.getMonth() - 8, now.getDate()).toISOString(),
        content_url: 'file://test-photo-8m.jpg',
      },
      {
        title: 'Test URL - 10 months ago',
        description: 'A test URL from 10 months ago',
        source: 'url' as const,
        platform: 'generic' as const,
        source_date: new Date(now.getFullYear(), now.getMonth() - 10, now.getDate()).toISOString(),
        content_url: 'https://example.com/url-10m',
      },
    ];
    
    // Create the items
    for (const itemData of testItems) {
      const item = await ItemsRepository.create(itemData);
      console.log(`✅ Created: ${item.title} (${item.source_date})`);
    }
    
    console.log(`\n🎉 Created ${testItems.length} test items with source dates!`);
    console.log('Now try refreshing the Memories tab to see them.');
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  }
}

/**
 * Updates existing items to have source_date based on their created_at
 * (Useful for existing data without source_date)
 */
export async function backfillSourceDates(): Promise<void> {
  console.log('🔄 Backfilling source_date for existing items...');
  
  try {
    const database = await getDatabase();
    
    // Update items without source_date to use created_at as source_date
    const result = await database.runAsync(
      `UPDATE ${TABLES.ITEMS} 
       SET source_date = created_at 
       WHERE source_date IS NULL`
    );
    
    console.log(`✅ Updated ${result.changes} items with source_date`);
    console.log('Note: This uses created_at as source_date, which may not be the original creation time.');
    
  } catch (error) {
    console.error('❌ Error backfilling source dates:', error);
  }
}

/**
 * Clean up test data
 */
export async function cleanupTestMemoriesData(): Promise<void> {
  console.log('🧹 Cleaning up test memories data...');
  
  try {
    const database = await getDatabase();
    
    const result = await database.runAsync(
      `DELETE FROM ${TABLES.ITEMS} WHERE title LIKE 'Test %'`
    );
    
    console.log(`✅ Cleaned up ${result.changes} test items`);
    
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
  }
}
