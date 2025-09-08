import {
  performOcr,
  extractTextFromImage,
  processItemOcr,
  processBatchOcr,
  setOcrConfig,
  getOcrConfig,
  getOcrProcessingStatus,
  clearItemOcr,
  clearAllOcr,
  DEFAULT_OCR_CONFIG,
  OcrConfig,
} from '../ocr';
import { ItemsRepository } from '../../../data/repositories/items';
import { Item } from '../../../data/models';

// Mock the ItemsRepository
jest.mock('../../../data/repositories/items');
const mockItemsRepository = ItemsRepository as jest.Mocked<typeof ItemsRepository>;

describe('OCR Parser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset OCR config to default
    setOcrConfig(DEFAULT_OCR_CONFIG);
  });

  describe('OCR Configuration', () => {
    it('should set and get OCR configuration', () => {
      const newConfig: Partial<OcrConfig> = {
        enabled: false,
        mode: 'expo-text-recognition',
        batchSize: 10,
      };

      setOcrConfig(newConfig);
      const config = getOcrConfig();

      expect(config.enabled).toBe(false);
      expect(config.mode).toBe('expo-text-recognition');
      expect(config.batchSize).toBe(10);
      expect(config.maxRetries).toBe(DEFAULT_OCR_CONFIG.maxRetries);
    });

    it('should return default configuration initially', () => {
      const config = getOcrConfig();
      expect(config).toEqual(DEFAULT_OCR_CONFIG);
    });
  });

  describe('performOcr', () => {
    it('should return error when OCR is disabled', async () => {
      setOcrConfig({ enabled: false });

      const result = await performOcr('test-image-uri');

      expect(result.success).toBe(false);
      expect(result.error).toBe('OCR is disabled');
    });

    it('should perform mock OCR when in demo mode', async () => {
      setOcrConfig({ enabled: true, mode: 'demo' });

      const result = await performOcr('test-image-uri');

      expect(result.success).toBe(true);
      expect(result.text).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(typeof result.text).toBe('string');
      expect(typeof result.confidence).toBe('number');
    });

    it('should handle OCR errors gracefully', async () => {
      setOcrConfig({ enabled: true, mode: 'expo-text-recognition' });

      // Mock the dynamic import to throw an error
      jest.doMock('expo-text-recognition', () => {
        throw new Error('Module not available');
      });

      const result = await performOcr('test-image-uri');

      expect(result.success).toBe(true); // Should fallback to mock OCR
      expect(result.text).toBeDefined();
    });
  });

  describe('extractTextFromImage', () => {
    it('should extract text from image successfully', async () => {
      setOcrConfig({ enabled: true, mode: 'demo' });

      const text = await extractTextFromImage('test-image-uri');

      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(0);
    });

    it('should return mocked text when OCR fails', async () => {
      setOcrConfig({ enabled: false });

      const text = await extractTextFromImage('test-image-uri');

      expect(text).toBe('[mocked OCR] - OCR processing failed, but item marked as processed');
    });
  });

  describe('processItemOcr', () => {
    const mockItem: Item = {
      id: 'test-item-id',
      title: 'Test Item',
      description: 'Test Description',
      content_url: 'file://test-image.jpg',
      source: 'screenshot',
      platform: 'generic',
      source_date: '2024-01-15T10:00:00.000Z',
      created_at: '2024-01-15T10:00:00.000Z',
      ingested_at: '2024-01-15T10:00:00.000Z',
      updated_at: '2024-01-15T10:00:00.000Z',
      ocr_done: false,
    };

    it('should process item OCR successfully', async () => {
      setOcrConfig({ enabled: true, mode: 'demo' });
      mockItemsRepository.update.mockResolvedValue({ ...mockItem, ocr_done: true });

      const result = await processItemOcr(mockItem);

      expect(result).toBe(true);
      expect(mockItemsRepository.update).toHaveBeenCalledWith(mockItem.id, {
        ocr_text: expect.any(String),
        ocr_done: true,
      });
    });

    it('should return false when item has no content_url', async () => {
      const itemWithoutUrl = { ...mockItem, content_url: undefined };

      const result = await processItemOcr(itemWithoutUrl);

      expect(result).toBe(false);
      expect(mockItemsRepository.update).not.toHaveBeenCalled();
    });

    it('should handle OCR processing errors', async () => {
      setOcrConfig({ enabled: true, mode: 'demo' });
      mockItemsRepository.update.mockRejectedValue(new Error('Database error'));

      const result = await processItemOcr(mockItem);

      expect(result).toBe(false);
    });
  });

  describe('processBatchOcr', () => {
    const mockItems: Item[] = [
      {
        id: 'item-1',
        title: 'Item 1',
        content_url: 'file://test1.jpg',
        source: 'screenshot',
        platform: 'generic',
        source_date: '2024-01-15T10:00:00.000Z',
        created_at: '2024-01-15T10:00:00.000Z',
        ingested_at: '2024-01-15T10:00:00.000Z',
        updated_at: '2024-01-15T10:00:00.000Z',
        ocr_done: false,
      },
      {
        id: 'item-2',
        title: 'Item 2',
        content_url: 'file://test2.jpg',
        source: 'screenshot',
        platform: 'generic',
        source_date: '2024-01-15T10:00:00.000Z',
        created_at: '2024-01-15T10:00:00.000Z',
        ingested_at: '2024-01-15T10:00:00.000Z',
        updated_at: '2024-01-15T10:00:00.000Z',
        ocr_done: false,
      },
    ];

    it('should process batch OCR successfully', async () => {
      setOcrConfig({ enabled: true, mode: 'demo' });
      mockItemsRepository.update.mockResolvedValue({ ...mockItems[0], ocr_done: true });

      const progressCallback = jest.fn();
      const result = await processBatchOcr(mockItems, progressCallback);

      expect(result.totalItems).toBe(2);
      expect(result.processedItems).toBe(2);
      expect(result.failedItems).toBe(0);
      expect(result.isProcessing).toBe(false);
      expect(progressCallback).toHaveBeenCalledTimes(2);
    });

    it('should throw error when OCR is disabled', async () => {
      setOcrConfig({ enabled: false });

      await expect(processBatchOcr(mockItems)).rejects.toThrow('OCR is disabled');
    });

    it('should handle partial failures in batch processing', async () => {
      setOcrConfig({ enabled: true, mode: 'demo' });
      mockItemsRepository.update
        .mockResolvedValueOnce({ ...mockItems[0], ocr_done: true })
        .mockRejectedValueOnce(new Error('Database error'));

      const result = await processBatchOcr(mockItems);

      expect(result.totalItems).toBe(2);
      expect(result.processedItems).toBe(1);
      expect(result.failedItems).toBe(1);
    });
  });

  describe('OCR Status and Cleanup', () => {
    it('should get OCR processing status', () => {
      const status = getOcrProcessingStatus();

      expect(status).toHaveProperty('totalItems');
      expect(status).toHaveProperty('processedItems');
      expect(status).toHaveProperty('failedItems');
      expect(status).toHaveProperty('isProcessing');
    });

    it('should clear item OCR data', async () => {
      mockItemsRepository.update.mockResolvedValue({} as Item);

      const result = await clearItemOcr('test-item-id');

      expect(result).toBe(true);
      expect(mockItemsRepository.update).toHaveBeenCalledWith('test-item-id', {
        ocr_text: '',
        ocr_done: false,
      });
    });

    it('should handle clear item OCR errors', async () => {
      mockItemsRepository.update.mockRejectedValue(new Error('Database error'));

      const result = await clearItemOcr('test-item-id');

      expect(result).toBe(false);
    });
  });
});
