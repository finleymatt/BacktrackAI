import { initDatabase } from './db';
import { ItemsRepository, FoldersRepository, TagsRepository } from './repositories';
import { Source, TABLES } from './models';

// Development seed data
const seedData = {
  folders: [
    { name: 'Travel', description: 'Travel memories and experiences', color: '#FF6B6B' },
    { name: 'Food', description: 'Delicious meals and recipes', color: '#4ECDC4' },
    { name: 'Work', description: 'Professional content and projects', color: '#45B7D1' },
    { name: 'Personal', description: 'Personal moments and thoughts', color: '#96CEB4' },
  ],
  tags: [
    { name: 'important', color: '#FF6B6B' },
    { name: 'favorite', color: '#FFD93D' },
    { name: 'work', color: '#6BCF7F' },
    { name: 'personal', color: '#4D96FF' },
    { name: 'travel', color: '#FF8A80' },
    { name: 'food', color: '#FFB74D' },
  ],
  items: [
    {
      title: 'Amazing sunset in Santorini',
      description: 'Beautiful sunset view from our hotel balcony',
      content_url: 'https://example.com/santorini-sunset.jpg',
      thumbnail_url: 'https://example.com/santorini-sunset-thumb.jpg',
      source: 'photo_scan' as Source,
    },
    {
      title: 'Delicious pasta recipe',
      description: 'Homemade carbonara that turned out perfectly',
      content_url: 'https://example.com/pasta-recipe.jpg',
      thumbnail_url: 'https://example.com/pasta-recipe-thumb.jpg',
      source: 'photo_scan' as Source,
    },
    {
      title: 'Project presentation slides',
      description: 'Q4 presentation for the team meeting',
      content_url: 'https://example.com/presentation.pdf',
      thumbnail_url: 'https://example.com/presentation-thumb.jpg',
      source: 'shared_url' as Source,
    },
    {
      title: 'Weekend hiking trail',
      description: 'Great trail near the mountains with amazing views',
      content_url: 'https://example.com/hiking-trail.jpg',
      thumbnail_url: 'https://example.com/hiking-trail-thumb.jpg',
      source: 'photo_scan' as Source,
    },
    {
      title: 'Team building event',
      description: 'Fun day with colleagues at the company retreat',
      content_url: 'https://example.com/team-building.jpg',
      thumbnail_url: 'https://example.com/team-building-thumb.jpg',
      source: 'shared_url' as Source,
    },
  ],
};

// Seed the database with sample data
export const seedDatabase = async (): Promise<void> => {
  try {
    console.log('Starting database seeding...');
    
    // Initialize database
    await initDatabase();

    // Check if data already exists
    const existingItems = await ItemsRepository.getCount();
    if (existingItems > 0) {
      console.log('Database already contains data, skipping seed');
      return;
    }

    // Create folders
    console.log('Creating folders...');
    const createdFolders = [];
    for (const folderData of seedData.folders) {
      const folder = await FoldersRepository.create(folderData);
      createdFolders.push(folder);
      console.log(`Created folder: ${folder.name}`);
    }

    // Create tags
    console.log('Creating tags...');
    const createdTags = [];
    for (const tagData of seedData.tags) {
      const tag = await TagsRepository.create(tagData);
      createdTags.push(tag);
      console.log(`Created tag: ${tag.name}`);
    }

    // Create items
    console.log('Creating items...');
    const createdItems = [];
    for (const itemData of seedData.items) {
      const item = await ItemsRepository.create(itemData);
      createdItems.push(item);
      console.log(`Created item: ${item.title}`);
    }

    // Add some relationships
    console.log('Creating relationships...');
    
    // Add items to folders
    if (createdItems.length > 0 && createdFolders.length > 0) {
      // Travel folder gets travel-related items
      await FoldersRepository.addItemToFolder(createdItems[0].id, createdFolders[0].id); // Santorini sunset
      await FoldersRepository.addItemToFolder(createdItems[3].id, createdFolders[0].id); // Hiking trail
      
      // Food folder gets food-related items
      await FoldersRepository.addItemToFolder(createdItems[1].id, createdFolders[1].id); // Pasta recipe
      
      // Work folder gets work-related items
      await FoldersRepository.addItemToFolder(createdItems[2].id, createdFolders[2].id); // Presentation
      await FoldersRepository.addItemToFolder(createdItems[4].id, createdFolders[2].id); // Team building
      
      // Personal folder gets personal items
      await FoldersRepository.addItemToFolder(createdItems[0].id, createdFolders[3].id); // Santorini sunset
      await FoldersRepository.addItemToFolder(createdItems[3].id, createdFolders[3].id); // Hiking trail
    }

    // Add tags to items
    if (createdItems.length > 0 && createdTags.length > 0) {
      // Add 'favorite' tag to first item
      await TagsRepository.addTagToItem(createdItems[0].id, createdTags[1].id);
      
      // Add 'important' tag to work items
      await TagsRepository.addTagToItem(createdItems[2].id, createdTags[0].id);
      await TagsRepository.addTagToItem(createdItems[4].id, createdTags[0].id);
      
      // Add 'travel' tag to travel items
      await TagsRepository.addTagToItem(createdItems[0].id, createdTags[4].id);
      await TagsRepository.addTagToItem(createdItems[3].id, createdTags[4].id);
      
      // Add 'food' tag to food items
      await TagsRepository.addTagToItem(createdItems[1].id, createdTags[5].id);
      
      // Add 'work' tag to work items
      await TagsRepository.addTagToItem(createdItems[2].id, createdTags[2].id);
      await TagsRepository.addTagToItem(createdItems[4].id, createdTags[2].id);
    }

    console.log('Database seeding completed successfully!');
    console.log(`Created ${createdFolders.length} folders, ${createdTags.length} tags, ${createdItems.length} items`);
    
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};

// Clear all data (for development)
export const clearDatabase = async (): Promise<void> => {
  try {
    console.log('Clearing database...');
    const db = await initDatabase();
    
    // Delete all data in correct order (respecting foreign keys)
    await db.execAsync(`DELETE FROM ${TABLES.ITEM_TAGS}`);
    await db.execAsync(`DELETE FROM ${TABLES.ITEM_FOLDERS}`);
    await db.execAsync(`DELETE FROM ${TABLES.ITEMS}`);
    await db.execAsync(`DELETE FROM ${TABLES.FOLDERS}`);
    await db.execAsync(`DELETE FROM ${TABLES.TAGS}`);
    await db.execAsync(`DELETE FROM ${TABLES.USERS}`);
    
    console.log('Database cleared successfully!');
  } catch (error) {
    console.error('Error clearing database:', error);
    throw error;
  }
};
