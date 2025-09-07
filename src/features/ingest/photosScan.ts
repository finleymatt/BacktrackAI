import * as MediaLibrary from 'expo-media-library';
import { ItemsRepository } from '../../data/repositories/items';
import { Item } from '../../data/models';
import { processItemOcr, getOcrConfig, OcrProgressCallback } from './ocr';

export interface ScreenshotDetectionResult {
  success: boolean;
  itemsCreated: number;
  errors: string[];
  permissionGranted: boolean;
}

export interface ScreenshotCandidate {
  uri: string;
  filename: string;
  creationTime: number;
  width: number;
  height: number;
  aspectRatio: number;
}

/**
 * Request Photos permission with user-friendly rationale
 */
export const requestPhotosPermission = async (): Promise<boolean> => {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Failed to request photos permission:', error);
    return false;
  }
};

/**
 * Check if Photos permission is already granted
 */
export const checkPhotosPermission = async (): Promise<boolean> => {
  try {
    const { status } = await MediaLibrary.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Failed to check photos permission:', error);
    return false;
  }
};

/**
 * Detect if an image is likely a screenshot based on heuristics
 */
export const isScreenshot = (asset: MediaLibrary.Asset): boolean => {
  // Heuristic 1: Filename patterns (most reliable indicator)
  const filename = asset.filename.toLowerCase();
  const screenshotPatterns = [
    'screenshot',
    'screen_shot',
    'screen shot',
    'capture',
    'snapshot',
    'img_', // Common Android pattern
    'photo_', // Common iOS pattern with timestamp
    'screenshot_', // Common pattern
    'screen_', // Common pattern
    'scrn_', // Abbreviated
    'scr_', // Abbreviated
  ];
  
  const hasScreenshotFilename = screenshotPatterns.some(pattern => 
    filename.includes(pattern)
  );

  // Heuristic 2: Aspect ratio (screenshots are often device screen ratios)
  const aspectRatio = asset.width / asset.height;
  const commonScreenRatios = [
    16/9,    // 1.78 - Common widescreen
    18/9,    // 2.0 - Modern phones
    19.5/9,  // 2.17 - iPhone X series
    20/9,    // 2.22 - Ultra-wide phones
    4/3,     // 1.33 - iPad/older devices
    3/2,     // 1.5 - Some tablets
    21/9,    // 2.33 - Ultra-wide
    18.5/9,  // 2.06 - Some modern phones
  ];
  
  const hasScreenAspectRatio = commonScreenRatios.some(ratio => 
    Math.abs(aspectRatio - ratio) < 0.15 // Allow 15% tolerance
  );

  // Heuristic 3: Creation time (screenshots are usually recent)
  const now = Date.now();
  const assetTime = asset.creationTime * 1000; // Convert to milliseconds
  const isRecent = (now - assetTime) < (30 * 24 * 60 * 60 * 1000); // Last 30 days

  // Heuristic 4: Exclude obvious non-screenshots
  const isObviousPhoto = filename.includes('dsc') || // Digital camera photos
                        filename.includes('camera') || // Camera app
                        filename.includes('snapchat') || // Social media
                        filename.includes('instagram') ||
                        filename.includes('whatsapp') ||
                        filename.includes('telegram') ||
                        filename.includes('facebook') ||
                        filename.includes('twitter') ||
                        filename.includes('tiktok');

  // Heuristic 5: File size (screenshots are usually smaller than photos)
  const isReasonableSize = asset.width > 100 && asset.height > 100 && 
                          asset.width < 5000 && asset.height < 5000;

  // Combine heuristics with weighted scoring
  let score = 0;
  if (hasScreenshotFilename) score += 5; // Increased weight for filename
  if (hasScreenAspectRatio) score += 3; // Increased weight for aspect ratio
  if (isRecent) score += 2; // Increased weight for recent
  if (isReasonableSize) score += 1; // Bonus for reasonable size
  if (isObviousPhoto) score -= 4; // Strong penalty for obvious photos

  // Consider it a screenshot if score >= 3 (lowered threshold)
  return score >= 3;
};

/**
 * Get recent images from the device's photo library
 */
export const getRecentImages = async (limit: number = 100): Promise<MediaLibrary.Asset[]> => {
  try {
    const hasPermission = await checkPhotosPermission();
    if (!hasPermission) {
      throw new Error('Photos permission not granted');
    }

    // First, try to get all photos directly without specifying an album
    // This is more reliable across different devices and OS versions
    const assets = await MediaLibrary.getAssetsAsync({
      first: limit,
      mediaType: MediaLibrary.MediaType.photo,
      sortBy: [MediaLibrary.SortBy.creationTime],
    });

    if (assets.assets.length > 0) {
      return assets.assets;
    }

    // Fallback: try to find albums if direct access doesn't work
    const albums = await MediaLibrary.getAlbumsAsync({
      includeSmartAlbums: true,
    });

    console.log('Available albums:', albums.map(album => album.title));

    // Look for common album names across different platforms
    const recentAlbum = albums.find((album: MediaLibrary.Album) => {
      const title = album.title.toLowerCase();
      return (
        title.includes('recent') ||
        title.includes('camera roll') ||
        title.includes('all photos') ||
        title.includes('photos') ||
        title.includes('library') ||
        title === 'recents' ||
        title === 'camera' ||
        title === 'all'
      );
    });

    if (!recentAlbum) {
      // If no specific album found, try the first album that has photos
      for (const album of albums) {
        try {
          const albumAssets = await MediaLibrary.getAssetsAsync({
            album: album,
            first: 1,
            mediaType: MediaLibrary.MediaType.photo,
          });
          if (albumAssets.assets.length > 0) {
            // Found an album with photos, get more from it
            const moreAssets = await MediaLibrary.getAssetsAsync({
              album: album,
              first: limit,
              mediaType: MediaLibrary.MediaType.photo,
              sortBy: [MediaLibrary.SortBy.creationTime],
            });
            return moreAssets.assets;
          }
        } catch (error) {
          console.warn(`Failed to get assets from album ${album.title}:`, error);
          continue;
        }
      }
      throw new Error('No albums with photos found');
    }

    const albumAssets = await MediaLibrary.getAssetsAsync({
      album: recentAlbum,
      first: limit,
      mediaType: MediaLibrary.MediaType.photo,
      sortBy: [MediaLibrary.SortBy.creationTime],
    });

    return albumAssets.assets;
  } catch (error) {
    console.error('Failed to get recent images:', error);
    throw error;
  }
};

/**
 * Convert MediaLibrary asset to ScreenshotCandidate
 */
export const assetToCandidate = (asset: MediaLibrary.Asset): ScreenshotCandidate => {
  return {
    uri: asset.uri,
    filename: asset.filename,
    creationTime: asset.creationTime,
    width: asset.width,
    height: asset.height,
    aspectRatio: asset.width / asset.height,
  };
};

/**
 * Create an Item from a screenshot candidate
 */
export const createItemFromScreenshot = async (candidate: ScreenshotCandidate): Promise<Item> => {
  const title = `Screenshot - ${new Date(candidate.creationTime * 1000).toLocaleDateString()}`;
  const description = `Captured screenshot from ${candidate.filename}`;

  // Create item with OCR processing disabled initially
  const item = await ItemsRepository.create({
    title,
    description,
    content_url: candidate.uri,
    thumbnail_url: candidate.uri, // Use the same URI for thumbnail
    source: 'photo_scan',
    ocr_done: false, // Will be processed in background
  });

  // Process OCR in background if enabled
  const ocrConfig = getOcrConfig();
  if (ocrConfig.enabled) {
    // Don't await - process in background
    processItemOcr(item).catch(error => {
      console.error(`Background OCR failed for item ${item.id}:`, error);
    });
  }

  return item;
};

/**
 * Create a screenshot item with pending OCR status (new workflow)
 */
export const createScreenshotItem = async (candidate: ScreenshotCandidate): Promise<Item> => {
  const title = `Screenshot - ${new Date(candidate.creationTime * 1000).toLocaleDateString()}`;
  const description = `Captured screenshot from ${candidate.filename}`;
  const sourceDate = new Date(candidate.creationTime * 1000).toISOString();

  // Create item with pending OCR status
  const item = await ItemsRepository.create({
    title,
    description,
    content_url: candidate.uri,
    thumbnail_url: candidate.uri, // Use the same URI for thumbnail
    source: 'screenshot',
    source_date: sourceDate,
    ocr_done: false, // Legacy field
    ocr_status: 'pending', // New field for OCR workflow
  });

  return item;
};

/**
 * Main function to scan for screenshots and ingest them into the database
 */
export const scanAndIngestScreenshots = async (): Promise<ScreenshotDetectionResult> => {
  const result: ScreenshotDetectionResult = {
    success: false,
    itemsCreated: 0,
    errors: [],
    permissionGranted: false,
  };

  try {
    // Check or request permission
    let hasPermission = await checkPhotosPermission();
    if (!hasPermission) {
      hasPermission = await requestPhotosPermission();
    }

    result.permissionGranted = hasPermission;

    if (!hasPermission) {
      result.errors.push('Photos permission denied by user');
      return result;
    }

    // Clean up orphaned items first
    console.log('Cleaning up orphaned screenshot items...');
    const cleanedCount = await cleanupOrphanedScreenshots();
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} orphaned items`);
    }

    // Get recent images
    const recentImages = await getRecentImages(200); // Get more images to increase chances of finding screenshots
    
    console.log(`Retrieved ${recentImages.length} recent images from photo library`);
    
    if (recentImages.length === 0) {
      result.errors.push('No photos found in your photo library');
      return result;
    }
    
    // Debug: Log some sample filenames to understand what we're working with
    console.log('Sample recent image filenames:', recentImages.slice(0, 5).map(img => img.filename));
    
    // Filter for screenshots
    const screenshotCandidates = recentImages
      .filter(isScreenshot)
      .map(assetToCandidate);

    console.log(`Found ${screenshotCandidates.length} potential screenshots out of ${recentImages.length} recent images`);
    
    // Debug: Log the filenames of detected screenshots
    if (screenshotCandidates.length > 0) {
      console.log('Detected screenshot filenames:', screenshotCandidates.map(c => c.filename));
    }

    // Create items for each screenshot (avoiding duplicates)
    for (const candidate of screenshotCandidates) {
      try {
        // Check if this screenshot is already ingested
        const alreadyIngested = await isScreenshotAlreadyIngested(candidate.uri);
        if (alreadyIngested) {
          console.log(`Skipping already ingested screenshot: ${candidate.filename}`);
          continue;
        }
        
        await createItemFromScreenshot(candidate);
        result.itemsCreated++;
      } catch (error) {
        const errorMsg = `Failed to create item for ${candidate.filename}: ${error}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }

    result.success = true;
    console.log(`Successfully ingested ${result.itemsCreated} screenshots`);

  } catch (error) {
    const errorMsg = `Failed to scan screenshots: ${error}`;
    console.error(errorMsg);
    result.errors.push(errorMsg);
  }

  return result;
};

/**
 * Debug function to show what's in the photo library
 */
export const debugPhotoLibrary = async (limit: number = 20): Promise<void> => {
  try {
    const hasPermission = await requestPhotosPermission();
    if (!hasPermission) {
      console.log('❌ Photos permission denied');
      return;
    }

    const recentImages = await getRecentImages(limit);
    console.log(`📸 Found ${recentImages.length} recent images in photo library:`);
    
    recentImages.forEach((img, index) => {
      const aspectRatio = (img.width / img.height).toFixed(2);
      const creationDate = new Date(img.creationTime * 1000).toLocaleString();
      console.log(`${index + 1}. ${img.filename}`);
      console.log(`   Size: ${img.width}x${img.height} (${aspectRatio})`);
      console.log(`   Created: ${creationDate}`);
      console.log(`   URI: ${img.uri}`);
      console.log('');
    });
  } catch (error) {
    console.error('Failed to debug photo library:', error);
  }
};

/**
 * New simplified function to scan screenshots and ingest them without OCR
 * This is the main function that should be called from AddScreen
 */
export const scanScreenshots = async (limit: number = 50): Promise<string[]> => {
  try {
    // Request Photos permission
    const hasPermission = await requestPhotosPermission();
    if (!hasPermission) {
      throw new Error('Photos permission denied by user');
    }

    // Get recent images
    const recentImages = await getRecentImages(limit);
    
    if (recentImages.length === 0) {
      console.log('No photos found in your photo library');
      return [];
    }
    
    // Filter for screenshots
    const screenshotCandidates = recentImages
      .filter(isScreenshot)
      .map(assetToCandidate);

    console.log(`Found ${screenshotCandidates.length} potential screenshots out of ${recentImages.length} recent images`);
    
    // Debug: Log some sample filenames to understand what we're working with
    if (recentImages.length > 0) {
      console.log('Sample recent image filenames:', recentImages.slice(0, 10).map(img => ({
        filename: img.filename,
        width: img.width,
        height: img.height,
        aspectRatio: (img.width / img.height).toFixed(2),
        creationTime: new Date(img.creationTime * 1000).toLocaleString()
      })));
    }
    
    // Debug: Log the filenames of detected screenshots
    if (screenshotCandidates.length > 0) {
      console.log('Detected screenshot filenames:', screenshotCandidates.map(c => ({
        filename: c.filename,
        width: c.width,
        height: c.height,
        aspectRatio: c.aspectRatio.toFixed(2),
        creationTime: new Date(c.creationTime * 1000).toLocaleString()
      })));
    } else {
      console.log('No screenshots detected. This might be because:');
      console.log('1. Your device uses different filename patterns');
      console.log('2. The aspect ratio detection is too strict');
      console.log('3. The images are not recent enough');
      console.log('4. The scoring threshold is too high');
    }

    const insertedItemIds: string[] = [];

    // Create items for each screenshot (avoiding duplicates)
    for (const candidate of screenshotCandidates) {
      try {
        // Check if this screenshot is already ingested
        const alreadyIngested = await isScreenshotAlreadyIngested(candidate.uri);
        if (alreadyIngested) {
          console.log(`Skipping already ingested screenshot: ${candidate.filename}`);
          continue;
        }
        
        const item = await createScreenshotItem(candidate);
        insertedItemIds.push(item.id);
        console.log(`✅ Successfully created item for ${candidate.filename}`);
      } catch (error) {
        console.error(`❌ Failed to create item for ${candidate.filename}:`, error);
        // Continue processing other items
      }
    }

    console.log(`Successfully ingested ${insertedItemIds.length} screenshots`);
    return insertedItemIds;

  } catch (error) {
    console.error('Failed to scan screenshots:', error);
    throw error;
  }
};

/**
 * Get screenshots that have already been ingested (to avoid duplicates)
 */
export const getIngestedScreenshots = async (): Promise<Item[]> => {
  try {
    return await ItemsRepository.getBySource('screenshot');
  } catch (error) {
    console.error('Failed to get ingested screenshots:', error);
    return [];
  }
};

/**
 * Check if a screenshot URI has already been ingested and the file still exists
 */
export const isScreenshotAlreadyIngested = async (uri: string): Promise<boolean> => {
  try {
    const ingestedScreenshots = await getIngestedScreenshots();
    const existingItem = ingestedScreenshots.find(item => item.content_url === uri);
    
    if (!existingItem) {
      return false; // No item found with this URI
    }
    
    // Check if the file still exists by trying to get its info
    try {
        const assetInfo = await MediaLibrary.getAssetInfoAsync({ uri } as any);
      if (!assetInfo || !assetInfo.localUri) {
        // File no longer exists, remove the item from database
        console.log(`Screenshot file no longer exists, removing from database: ${uri}`);
        await ItemsRepository.delete(existingItem.id);
        return false;
      }
      return true; // File exists and is already ingested
    } catch (fileError) {
      // File doesn't exist or can't be accessed, remove the item
      console.log(`Screenshot file inaccessible, removing from database: ${uri}`);
      await ItemsRepository.delete(existingItem.id);
      return false;
    }
  } catch (error) {
    console.error('Failed to check if screenshot is already ingested:', error);
    return false;
  }
};

/**
 * Remove all photo_scan items from the database (for cleanup)
 */
export const clearAllScreenshots = async (): Promise<number> => {
  try {
    const ingestedScreenshots = await getIngestedScreenshots();
    let deletedCount = 0;
    
    for (const item of ingestedScreenshots) {
      const deleted = await ItemsRepository.delete(item.id);
      if (deleted) {
        deletedCount++;
      }
    }
    
    console.log(`Cleared ${deletedCount} screenshot items from database`);
    return deletedCount;
  } catch (error) {
    console.error('Failed to clear screenshots:', error);
    throw error;
  }
};

/**
 * Clean up orphaned screenshot items (items that reference files that no longer exist)
 */
export const cleanupOrphanedScreenshots = async (): Promise<number> => {
  try {
    const ingestedScreenshots = await getIngestedScreenshots();
    let cleanedCount = 0;
    
    console.log(`Checking ${ingestedScreenshots.length} ingested screenshots for orphaned items`);
    
    for (const item of ingestedScreenshots) {
      if (!item.content_url) {
        // Item has no content URL, remove it
        await ItemsRepository.delete(item.id);
        cleanedCount++;
        continue;
      }
      
      try {
        const assetInfo = await MediaLibrary.getAssetInfoAsync({ uri: item.content_url } as any);
        if (!assetInfo || !assetInfo.localUri) {
          // File no longer exists, remove the item
          console.log(`Removing orphaned item: ${item.title} (${item.content_url})`);
          await ItemsRepository.delete(item.id);
          cleanedCount++;
        }
      } catch (fileError) {
        // File doesn't exist or can't be accessed, remove the item
        console.log(`Removing inaccessible item: ${item.title} (${item.content_url})`);
        await ItemsRepository.delete(item.id);
        cleanedCount++;
      }
    }
    
    console.log(`Cleaned up ${cleanedCount} orphaned screenshot items`);
    return cleanedCount;
  } catch (error) {
    console.error('Failed to cleanup orphaned screenshots:', error);
    throw error;
  }
};

/**
 * Get OCR status summary for all screenshot items
 */
export const getScreenshotOcrStatus = async (): Promise<{
  total: number;
  withOcr: number;
  withoutOcr: number;
  items: Array<{ id: string; title: string; ocr_done: boolean; hasOcrText: boolean }>;
}> => {
  try {
    const ingestedScreenshots = await getIngestedScreenshots();
    const items = ingestedScreenshots.map(item => ({
      id: item.id,
      title: item.title,
      ocr_done: item.ocr_done,
      hasOcrText: !!(item.ocr_text && item.ocr_text.trim().length > 0)
    }));
    
    return {
      total: items.length,
      withOcr: items.filter(item => item.ocr_done && item.hasOcrText).length,
      withoutOcr: items.filter(item => !item.ocr_done || !item.hasOcrText).length,
      items
    };
  } catch (error) {
    console.error('Failed to get OCR status:', error);
    return { total: 0, withOcr: 0, withoutOcr: 0, items: [] };
  }
};

/**
 * Process OCR for all screenshot items that don't have it yet
 */
export const processScreenshotOcr = async (progressCallback?: OcrProgressCallback): Promise<{ processed: number; failed: number }> => {
  try {
    const ingestedScreenshots = await getIngestedScreenshots();
    const itemsNeedingOcr = ingestedScreenshots.filter(item => !item.ocr_done && item.content_url);
    
    console.log(`Total ingested screenshots: ${ingestedScreenshots.length}`);
    console.log(`Items needing OCR: ${itemsNeedingOcr.length}`);
    console.log(`Items with OCR done: ${ingestedScreenshots.filter(item => item.ocr_done).length}`);
    console.log(`Items with OCR text: ${ingestedScreenshots.filter(item => item.ocr_text && item.ocr_text.trim().length > 0).length}`);
    
    if (itemsNeedingOcr.length === 0) {
      console.log('No screenshots need OCR processing');
      return { processed: 0, failed: 0 };
    }

    console.log(`Processing OCR for ${itemsNeedingOcr.length} screenshots`);
    
    let processed = 0;
    let failed = 0;
    
    for (let i = 0; i < itemsNeedingOcr.length; i++) {
      const item = itemsNeedingOcr[i];
      
      try {
        const success = await processItemOcr(item);
        if (success) {
          processed++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`OCR failed for screenshot ${item.id}:`, error);
        failed++;
      }

      // Update progress
      if (progressCallback) {
        const current = i + 1;
        const percentage = (current / itemsNeedingOcr.length) * 100;
        progressCallback({
          current,
          total: itemsNeedingOcr.length,
          percentage,
          currentItem: item.title,
          processed,
          failed,
        });
      }
    }
    
    console.log(`OCR processing completed: ${processed} successful, ${failed} failed`);
    return { processed, failed };
  } catch (error) {
    console.error('Failed to process screenshot OCR:', error);
    throw error;
  }
};

/**
 * Force reprocess OCR for all screenshot items (even those that already have OCR)
 */
export const reprocessAllScreenshotOcr = async (progressCallback?: OcrProgressCallback): Promise<{ processed: number; failed: number }> => {
  try {
    const ingestedScreenshots = await getIngestedScreenshots();
    const itemsWithContent = ingestedScreenshots.filter(item => item.content_url);
    
    console.log(`Force reprocessing OCR for ${itemsWithContent.length} screenshots`);
    
    let processed = 0;
    let failed = 0;
    
    for (let i = 0; i < itemsWithContent.length; i++) {
      const item = itemsWithContent[i];
      
      try {
        // Reset OCR status first
        await ItemsRepository.update(item.id, {
          ocr_done: false,
          ocr_text: '',
        });
        
        const success = await processItemOcr(item);
        if (success) {
          processed++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`OCR reprocessing failed for screenshot ${item.id}:`, error);
        failed++;
      }

      // Update progress
      if (progressCallback) {
        const current = i + 1;
        const percentage = (current / itemsWithContent.length) * 100;
        progressCallback({
          current,
          total: itemsWithContent.length,
          percentage,
          currentItem: item.title,
          processed,
          failed,
        });
      }
    }
    
    console.log(`OCR reprocessing completed: ${processed} successful, ${failed} failed`);
    return { processed, failed };
  } catch (error) {
    console.error('Failed to reprocess screenshot OCR:', error);
    throw error;
  }
};
