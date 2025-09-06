import { ItemsRepository, FoldersRepository, TagsRepository } from './repositories';
import { DatabaseStats } from './models';

// Get database statistics for HomeScreen
export const getDatabaseStats = async (): Promise<DatabaseStats> => {
  const [totalItems, totalFolders, totalTags, recentItems] = await Promise.all([
    ItemsRepository.getCount(),
    FoldersRepository.getCount(),
    TagsRepository.getCount(),
    ItemsRepository.getRecentItemsCount(7),
  ]);

  return {
    totalItems,
    totalFolders,
    totalTags,
    recentItems,
  };
};
