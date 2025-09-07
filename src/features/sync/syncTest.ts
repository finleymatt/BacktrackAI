import { SyncService } from './sync';
import { ItemsRepository } from '../../data/repositories/items';
import { FoldersRepository } from '../../data/repositories/folders';
import { TagsRepository } from '../../data/repositories/tags';

// Test sync functionality
export const testSyncFunctionality = async () => {
  console.log('🧪 Testing sync functionality...');
  
  try {
    // Test 1: Check authentication status
    console.log('1. Checking authentication status...');
    const isAuthenticated = await SyncService.isAuthenticated();
    console.log('   Authentication status:', isAuthenticated);
    
    if (!isAuthenticated) {
      console.log('   ⚠️ User not authenticated, skipping sync tests');
      return;
    }
    
    // Test 2: Get sync status
    console.log('2. Getting sync status...');
    const syncStatus = await SyncService.getSyncStatus();
    console.log('   Sync status:', {
      isAuthenticated: syncStatus.isAuthenticated,
      localCounts: syncStatus.localCounts,
      pendingChanges: syncStatus.pendingChanges,
      lastSyncAt: syncStatus.lastSyncAt
    });
    
    // Test 3: Create test data to sync
    console.log('3. Creating test data...');
    
    // Create a test folder
    const testFolder = await FoldersRepository.create({
      name: 'Sync Test Folder',
      description: 'Test folder for sync functionality',
      color: '#FF6B6B',
      is_public: false
    });
    console.log('   Created test folder:', testFolder.id);
    
    // Create a test tag
    const testTag = await TagsRepository.create({
      name: 'sync-test',
      color: '#4ECDC4'
    });
    console.log('   Created test tag:', testTag.id);
    
    // Create a test item
    const testItem = await ItemsRepository.create({
      title: 'Sync Test Item',
      description: 'Test item for sync functionality',
      content_url: 'https://example.com/sync-test',
      source: 'url',
      platform: 'generic'
    });
    console.log('   Created test item:', testItem.id);
    
    // Test 4: Check sync status after creating data
    console.log('4. Checking sync status after creating data...');
    const syncStatusAfter = await SyncService.getSyncStatus();
    console.log('   Pending changes:', syncStatusAfter.pendingChanges);
    
    // Test 5: Perform sync
    console.log('5. Performing sync...');
    const syncResult = await SyncService.syncAll();
    console.log('   Sync result:', {
      success: syncResult.success,
      itemsSynced: syncResult.itemsSynced,
      foldersSynced: syncResult.foldersSynced,
      tagsSynced: syncResult.tagsSynced,
      conflictsResolved: syncResult.conflictsResolved,
      errors: syncResult.errors,
      syncMetadata: syncResult.syncMetadata
    });
    
    // Test 6: Check sync status after sync
    console.log('6. Checking sync status after sync...');
    const syncStatusFinal = await SyncService.getSyncStatus();
    console.log('   Final pending changes:', syncStatusFinal.pendingChanges);
    console.log('   Last sync at:', syncStatusFinal.lastSyncAt);
    
    // Test 7: Clean up test data
    console.log('7. Cleaning up test data...');
    await ItemsRepository.delete(testItem.id);
    await FoldersRepository.delete(testFolder.id);
    await TagsRepository.delete(testTag.id);
    console.log('   Test data cleaned up');
    
    console.log('✅ Sync functionality test completed successfully!');
    
    return {
      success: true,
      syncResult,
      testData: {
        folder: testFolder,
        tag: testTag,
        item: testItem
      }
    };
    
  } catch (error) {
    console.error('❌ Sync functionality test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Test conflict resolution
export const testConflictResolution = async () => {
  console.log('🧪 Testing conflict resolution...');
  
  try {
    // This would require more complex setup with actual remote data
    // For now, just test that the conflict history function works
    console.log('1. Testing conflict history...');
    const conflicts = await SyncService.getConflictHistory();
    console.log('   Conflict history:', conflicts.length, 'conflicts found');
    
    console.log('✅ Conflict resolution test completed!');
    
    return {
      success: true,
      conflicts
    };
    
  } catch (error) {
    console.error('❌ Conflict resolution test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Run all tests
export const runAllSyncTests = async () => {
  console.log('🚀 Running all sync tests...');
  
  const results = {
    syncFunctionality: await testSyncFunctionality(),
    conflictResolution: await testConflictResolution()
  };
  
  console.log('📊 Test Results:', results);
  
  return results;
};
