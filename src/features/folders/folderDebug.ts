// Debug utilities for folder functionality
import { resetFoldersTable, getDatabase } from '../../data/db';
import { TABLES } from '../../data/models';

export const debugFoldersTable = async () => {
  console.log('🔍 Debugging folders table...');
  
  try {
    const db = await getDatabase();
    
    // Check if folders table exists
    const tableExists = await db.getFirstAsync(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      [TABLES.FOLDERS]
    );
    
    console.log('📋 Folders table exists:', !!tableExists);
    
    if (tableExists) {
      // Check table structure
      const tableInfo = await db.getAllAsync(`PRAGMA table_info(${TABLES.FOLDERS});`);
      console.log('📋 Folders table columns:', tableInfo.map((col: any) => col.name));
      
      // Check if is_public column exists
      const hasIsPublic = tableInfo.some((col: any) => col.name === 'is_public');
      console.log('📋 Has is_public column:', hasIsPublic);
      
      if (!hasIsPublic) {
        console.log('⚠️ is_public column missing, attempting to add...');
        try {
          await db.execAsync(`ALTER TABLE ${TABLES.FOLDERS} ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT 0;`);
          console.log('✅ is_public column added successfully');
        } catch (error) {
          console.error('❌ Failed to add is_public column:', error);
        }
      }
    } else {
      console.log('⚠️ Folders table does not exist, creating it...');
      await resetFoldersTable();
    }
    
    // Final verification
    const finalTableInfo = await db.getAllAsync(`PRAGMA table_info(${TABLES.FOLDERS});`);
    const finalColumns = finalTableInfo.map((col: any) => col.name);
    console.log('📋 Final folders table columns:', finalColumns);
    
    const hasIsPublicFinal = finalColumns.includes('is_public');
    console.log('✅ is_public column exists:', hasIsPublicFinal);
    
    return hasIsPublicFinal;
  } catch (error) {
    console.error('❌ Error debugging folders table:', error);
    return false;
  }
};

export const fixFoldersTable = async () => {
  console.log('🔧 Fixing folders table...');
  
  try {
    await resetFoldersTable();
    console.log('✅ Folders table fixed successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to fix folders table:', error);
    return false;
  }
};

// Export for use in development
export default { debugFoldersTable, fixFoldersTable };
