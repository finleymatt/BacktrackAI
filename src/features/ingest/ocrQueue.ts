import { ItemsRepository } from '../../data/repositories/items';
import { Item } from '../../data/models';
import { extractTextFromImage } from './ocr';

export interface OcrQueueOptions {
  batchSize?: number;
  maxBatchesPerRun?: number;
}

export interface OcrQueueResult {
  processed: number;
  remaining: number;
  errors: number;
}

/**
 * Process pending screenshot OCR in batches
 * This function processes screenshots that have ocr_status = 'pending'
 */
export const processPendingScreenshotOCR = async (options: OcrQueueOptions = {}): Promise<OcrQueueResult> => {
  const { batchSize = 10, maxBatchesPerRun = 5 } = options;
  
  let totalProcessed = 0;
  let totalErrors = 0;
  let batchesProcessed = 0;
  
  console.log(`Starting OCR processing with batch size ${batchSize}, max batches ${maxBatchesPerRun}`);
  
  while (batchesProcessed < maxBatchesPerRun) {
    // Get next batch of pending screenshots
    const pendingItems = await ItemsRepository.getScreenshotItemsNeedingOcr(batchSize);
    
    if (pendingItems.length === 0) {
      console.log('No more pending screenshots to process');
      break;
    }
    
    console.log(`Processing batch ${batchesProcessed + 1}: ${pendingItems.length} items`);
    
    // Process each item in the batch
    for (const item of pendingItems) {
      try {
        await processScreenshotItem(item);
        totalProcessed++;
        console.log(`✓ Processed OCR for item ${item.id}`);
      } catch (error) {
        console.error(`✗ Failed to process OCR for item ${item.id}:`, error);
        totalErrors++;
        
        // Mark item as error status
        try {
          await ItemsRepository.update(item.id, {
            ocr_status: 'error'
          });
        } catch (updateError) {
          console.error(`Failed to update error status for item ${item.id}:`, updateError);
        }
      }
    }
    
    batchesProcessed++;
    
    // Small delay between batches to keep UI responsive
    if (batchesProcessed < maxBatchesPerRun) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Get remaining count
  const remainingItems = await ItemsRepository.getScreenshotItemsNeedingOcr(1000); // Get a large number to count all
  const remaining = remainingItems.length;
  
  console.log(`OCR processing completed: ${totalProcessed} processed, ${totalErrors} errors, ${remaining} remaining`);
  
  return {
    processed: totalProcessed,
    remaining,
    errors: totalErrors
  };
};

/**
 * Process OCR for a single screenshot item
 */
const processScreenshotItem = async (item: Item): Promise<void> => {
  if (!item.content_url) {
    throw new Error('Item has no content_url');
  }
  
  try {
    // Extract text using OCR
    const ocrText = await extractTextFromImage(item.content_url);
    
    // Update item with OCR results
    await ItemsRepository.update(item.id, {
      ocr_text: ocrText,
      ocr_status: 'done',
      ocr_done: true // Update legacy field for backward compatibility
    });
    
  } catch (error) {
    console.error(`OCR failed for item ${item.id}:`, error);
    throw error;
  }
};

/**
 * Get OCR queue status
 */
export const getOcrQueueStatus = async (): Promise<{
  pending: number;
  done: number;
  error: number;
  total: number;
}> => {
  try {
    // Get all screenshot items
    const allScreenshots = await ItemsRepository.getBySource('screenshot');
    
    const status = {
      pending: 0,
      done: 0,
      error: 0,
      total: allScreenshots.length
    };
    
    for (const item of allScreenshots) {
      switch (item.ocr_status) {
        case 'pending':
          status.pending++;
          break;
        case 'done':
          status.done++;
          break;
        case 'error':
          status.error++;
          break;
        default:
          // Handle legacy items without ocr_status
          if (item.ocr_done) {
            status.done++;
          } else {
            status.pending++;
          }
          break;
      }
    }
    
    return status;
  } catch (error) {
    console.error('Failed to get OCR queue status:', error);
    return { pending: 0, done: 0, error: 0, total: 0 };
  }
};

/**
 * Reset OCR status for items with errors (retry failed items)
 */
export const resetErrorOcrItems = async (): Promise<number> => {
  try {
    const errorItems = await ItemsRepository.getBySource('screenshot');
    const itemsWithErrors = errorItems.filter(item => item.ocr_status === 'error');
    
    let resetCount = 0;
    for (const item of itemsWithErrors) {
      await ItemsRepository.update(item.id, {
        ocr_status: 'pending'
      });
      resetCount++;
    }
    
    console.log(`Reset ${resetCount} items with OCR errors to pending status`);
    return resetCount;
  } catch (error) {
    console.error('Failed to reset error OCR items:', error);
    throw error;
  }
};
