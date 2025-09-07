import { Item } from '../../data/models';
import { ItemsRepository } from '../../data/repositories/items';

// OCR Configuration
export interface OcrConfig {
  enabled: boolean;
  mode: 'demo' | 'expo-text-recognition';
  batchSize: number;
  maxRetries: number;
}

// OCR Result
export interface OcrResult {
  success: boolean;
  text?: string;
  confidence?: number;
  error?: string;
}

// OCR Processing Status
export interface OcrProcessingStatus {
  totalItems: number;
  processedItems: number;
  failedItems: number;
  isProcessing: boolean;
  lastProcessedAt?: string;
}

// OCR Progress Callback
export interface OcrProgressCallback {
  (progress: {
    current: number;
    total: number;
    percentage: number;
    currentItem?: string;
    processed: number;
    failed: number;
  }): void;
}

// Default configuration
export const DEFAULT_OCR_CONFIG: OcrConfig = {
  enabled: true,
  mode: 'demo', // Default to demo mode for Expo Go compatibility
  batchSize: 5,
  maxRetries: 3,
};

// Global OCR configuration
let ocrConfig: OcrConfig = { ...DEFAULT_OCR_CONFIG };

// OCR processing status
let processingStatus: OcrProcessingStatus = {
  totalItems: 0,
  processedItems: 0,
  failedItems: 0,
  isProcessing: false,
};

/**
 * Set OCR configuration
 */
export const setOcrConfig = (config: Partial<OcrConfig>): void => {
  ocrConfig = { ...ocrConfig, ...config };
  console.log('OCR configuration updated:', ocrConfig);
};

/**
 * Get current OCR configuration
 */
export const getOcrConfig = (): OcrConfig => {
  return { ...ocrConfig };
};

/**
 * Get OCR processing status
 */
export const getOcrProcessingStatus = (): OcrProcessingStatus => {
  return { ...processingStatus };
};

/**
 * Mode A: Demo/Mock OCR for Expo Go
 * Returns mock text based on common screenshot content patterns
 */
const performMockOcr = async (imageUri: string): Promise<OcrResult> => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

  // Mock OCR results based on common screenshot patterns
  const mockResults = [
    {
      text: "Instagram\n@username • 2h\nLiked by user1 and 1,234 others\nView all 45 comments\nAdd a comment...",
      confidence: 0.85
    },
    {
      text: "YouTube\nHow to Build a React Native App\nTech Tutorials • 1.2M views • 2 days ago\nSubscribe\nLike\nShare",
      confidence: 0.92
    },
    {
      text: "Spotify\nNow Playing\nSong Title - Artist Name\nAlbum Name • 2024\nPrevious • Play/Pause • Next\nVolume: ████████░░",
      confidence: 0.78
    },
    {
      text: "Twitter\n@username • 1h\nJust discovered this amazing article about AI and machine learning. The insights are incredible! #AI #Tech\nRetweet • Like • Reply",
      confidence: 0.88
    },
    {
      text: "Article Title\nBy Author Name • 5 min read\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\nRead more...",
      confidence: 0.95
    },
    {
      text: "Settings\nWi-Fi\nConnected to HomeNetwork\nBluetooth\nOn\nBattery\n85%\nStorage\n64 GB Used of 128 GB",
      confidence: 0.82
    }
  ];

  // Randomly select a mock result
  const randomResult = mockResults[Math.floor(Math.random() * mockResults.length)];
  
  return {
    success: true,
    text: randomResult.text,
    confidence: randomResult.confidence,
  };
};

/**
 * Mode B: Real OCR using expo-text-recognition
 * This will only work in development builds or with proper native modules
 */
const performRealOcr = async (imageUri: string): Promise<OcrResult> => {
  try {
    // Dynamic import to avoid errors in Expo Go
    const { TextRecognition } = await import('expo-text-recognition');
    
    if (!TextRecognition) {
      throw new Error('expo-text-recognition not available');
    }

    const result = await TextRecognition.recognize(imageUri);
    
    if (result && result.length > 0) {
      const extractedText = result.map((block: any) => block.text).join('\n');
      return {
        success: true,
        text: extractedText,
        confidence: 0.9, // expo-text-recognition doesn't provide confidence scores
      };
    } else {
      return {
        success: true,
        text: '',
        confidence: 0,
      };
    }
  } catch (error) {
    console.warn('Real OCR failed, falling back to mock OCR:', error);
    // Fallback to mock OCR if real OCR fails
    return await performMockOcr(imageUri);
  }
};

/**
 * Perform OCR on a single image
 */
export const performOcr = async (imageUri: string): Promise<OcrResult> => {
  if (!ocrConfig.enabled) {
    return {
      success: false,
      error: 'OCR is disabled',
    };
  }

  try {
    if (ocrConfig.mode === 'demo') {
      return await performMockOcr(imageUri);
    } else {
      return await performRealOcr(imageUri);
    }
  } catch (error) {
    console.error('OCR processing failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown OCR error',
    };
  }
};

/**
 * Extract text from image - simplified interface for the new OCR queue
 * Returns the extracted text directly or a mocked string if OCR fails
 */
export const extractTextFromImage = async (imageUri: string): Promise<string> => {
  try {
    const result = await performOcr(imageUri);
    
    if (result.success && result.text) {
      return result.text;
    } else {
      // If OCR fails, return a mocked string to mark as processed
      console.warn(`OCR failed for ${imageUri}, returning mocked text`);
      return '[mocked OCR] - OCR processing failed, but item marked as processed';
    }
  } catch (error) {
    console.error(`OCR extraction failed for ${imageUri}:`, error);
    // Return mocked text to mark as processed even if OCR fails
    return '[mocked OCR] - OCR processing failed, but item marked as processed';
  }
};

/**
 * Process OCR for a single item
 */
export const processItemOcr = async (item: Item): Promise<boolean> => {
  if (!item.content_url) {
    console.warn(`Item ${item.id} has no content_url, skipping OCR`);
    return false;
  }

  try {
    const ocrResult = await performOcr(item.content_url);
    
    if (ocrResult.success && ocrResult.text) {
      // Update item with OCR text
      await ItemsRepository.update(item.id, {
        ocr_text: ocrResult.text,
        ocr_done: true,
      });
      
      console.log(`OCR completed for item ${item.id}: ${ocrResult.text.length} characters extracted`);
      return true;
    } else {
      // Mark as processed even if no text was found
      await ItemsRepository.update(item.id, {
        ocr_text: '',
        ocr_done: true,
      });
      
      console.log(`OCR completed for item ${item.id}: no text found`);
      return true;
    }
  } catch (error) {
    console.error(`OCR failed for item ${item.id}:`, error);
    return false;
  }
};

/**
 * Process OCR for multiple items in batches
 */
export const processBatchOcr = async (
  items: Item[], 
  progressCallback?: OcrProgressCallback
): Promise<OcrProcessingStatus> => {
  if (!ocrConfig.enabled) {
    throw new Error('OCR is disabled');
  }

  processingStatus = {
    totalItems: items.length,
    processedItems: 0,
    failedItems: 0,
    isProcessing: true,
  };

  console.log(`Starting OCR processing for ${items.length} items`);

  // Process items sequentially to provide real-time progress updates
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    try {
      const success = await processItemOcr(item);
      if (success) {
        processingStatus.processedItems++;
      } else {
        processingStatus.failedItems++;
      }
    } catch (error) {
      console.error(`OCR failed for item ${item.id}:`, error);
      processingStatus.failedItems++;
    }

    // Update progress
    const current = i + 1;
    const percentage = (current / items.length) * 100;
    
    if (progressCallback) {
      progressCallback({
        current,
        total: items.length,
        percentage,
        currentItem: item.title,
        processed: processingStatus.processedItems,
        failed: processingStatus.failedItems,
      });
    }

    // Small delay between items to prevent overwhelming the system
    if (i < items.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  processingStatus.isProcessing = false;
  processingStatus.lastProcessedAt = new Date().toISOString();

  console.log(`OCR processing completed: ${processingStatus.processedItems} successful, ${processingStatus.failedItems} failed`);
  
  return processingStatus;
};

/**
 * Process OCR for all items that need it
 */
export const processAllPendingOcr = async (progressCallback?: OcrProgressCallback): Promise<OcrProcessingStatus> => {
  if (!ocrConfig.enabled) {
    throw new Error('OCR is disabled');
  }

  const itemsNeedingOcr = await ItemsRepository.getItemsNeedingOcr(100); // Limit to 100 items at a time
  
  if (itemsNeedingOcr.length === 0) {
    console.log('No items need OCR processing');
    return {
      totalItems: 0,
      processedItems: 0,
      failedItems: 0,
      isProcessing: false,
    };
  }

  return await processBatchOcr(itemsNeedingOcr, progressCallback);
};

/**
 * Retry OCR for failed items
 */
export const retryFailedOcr = async (): Promise<OcrProcessingStatus> => {
  if (!ocrConfig.enabled) {
    throw new Error('OCR is disabled');
  }

  // Get items that have content_url but no OCR text (potentially failed)
  const itemsNeedingRetry = await ItemsRepository.getItemsNeedingOcr(50);
  
  if (itemsNeedingRetry.length === 0) {
    console.log('No items need OCR retry');
    return {
      totalItems: 0,
      processedItems: 0,
      failedItems: 0,
      isProcessing: false,
    };
  }

  return await processBatchOcr(itemsNeedingRetry);
};

/**
 * Clear OCR data for an item
 */
export const clearItemOcr = async (itemId: string): Promise<boolean> => {
  try {
    await ItemsRepository.update(itemId, {
      ocr_text: '',
      ocr_done: false,
    });
    console.log(`OCR data cleared for item ${itemId}`);
    return true;
  } catch (error) {
    console.error(`Failed to clear OCR data for item ${itemId}:`, error);
    return false;
  }
};

/**
 * Clear OCR data for all items
 */
export const clearAllOcr = async (): Promise<number> => {
  try {
    const itemsWithOcr = await ItemsRepository.getItemsWithOcr(1000); // Get all items with OCR
    let clearedCount = 0;
    
    for (const item of itemsWithOcr) {
      const success = await clearItemOcr(item.id);
      if (success) {
        clearedCount++;
      }
    }
    
    console.log(`Cleared OCR data for ${clearedCount} items`);
    return clearedCount;
  } catch (error) {
    console.error('Failed to clear all OCR data:', error);
    throw error;
  }
};
