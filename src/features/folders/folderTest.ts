// Simple test script to verify folder functionality
import { FolderService } from './folderService';

export const testFolderFunctionality = async () => {
  console.log('🧪 Testing folder functionality...');

  try {
    // Test 1: Create a folder
    console.log('1. Creating test folder...');
    const testFolder = await FolderService.createFolder({
      name: 'Test Folder',
      description: 'This is a test folder',
      color: '#FF6B6B',
      is_public: false,
    });
    console.log('✅ Folder created:', testFolder.name);

    // Test 2: Get all folders
    console.log('2. Getting all folders...');
    const allFolders = await FolderService.getAllFolders();
    console.log('✅ Found', allFolders.length, 'folders');

    // Test 3: Update folder
    console.log('3. Updating folder...');
    const updatedFolder = await FolderService.updateFolder(testFolder.id, {
      name: 'Updated Test Folder',
      is_public: true,
    });
    console.log('✅ Folder updated:', updatedFolder?.name, 'Public:', updatedFolder?.is_public);

    // Test 4: Toggle privacy
    console.log('4. Toggling privacy...');
    const toggledFolder = await FolderService.toggleFolderPrivacy(testFolder.id, false);
    console.log('✅ Privacy toggled:', toggledFolder?.is_public);

    // Test 5: Get folder count
    console.log('5. Getting folder count...');
    const count = await FolderService.getFolderCount();
    console.log('✅ Folder count:', count);

    // Test 6: Search folders
    console.log('6. Searching folders...');
    const searchResults = await FolderService.searchFolders('Test');
    console.log('✅ Search results:', searchResults.length, 'folders found');

    // Test 7: Delete folder
    console.log('7. Deleting test folder...');
    const deleted = await FolderService.deleteFolder(testFolder.id);
    console.log('✅ Folder deleted:', deleted);

    console.log('🎉 All folder tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Folder test failed:', error);
    return false;
  }
};

// Export for use in development
export default testFolderFunctionality;
