import {
  getMemoriesWindows,
  selectMemories,
  groupMemoriesByPattern,
  isWithinQuietHours,
  getNextNotificationTime,
  DEFAULT_MEMORIES_SETTINGS,
  MemoriesSettings,
  DateRange,
} from '../selectMemories';
import { getDatabase } from '../../../data/db';
import { Item } from '../../../data/models';

// Mock the database
jest.mock('../../../data/db');
const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

describe('Memories Selector', () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDb = {
      getAllAsync: jest.fn(),
    };
    mockGetDatabase.mockResolvedValue(mockDb);
  });

  describe('getMemoriesWindows', () => {
    it('should create yearly windows for each prior year', () => {
      const today = new Date('2024-01-15T10:00:00.000Z');
      const settings = { ...DEFAULT_MEMORIES_SETTINGS };

      const windows = getMemoriesWindows(today, settings);

      // Should have windows for 2023, 2022, 2021, etc.
      const yearlyWindows = windows.filter(w => w.pattern === 'yearly');
      expect(yearlyWindows.length).toBeGreaterThan(0);
      expect(yearlyWindows[0].year).toBe(2023);
    });

    it('should create monthly windows for 2, 4, 6, 8, 10 months ago', () => {
      const today = new Date('2024-01-15T10:00:00.000Z');
      const settings = { ...DEFAULT_MEMORIES_SETTINGS };

      const windows = getMemoriesWindows(today, settings);

      const monthlyWindows = windows.filter(w => w.pattern === 'monthly');
      expect(monthlyWindows).toHaveLength(5);
      
      const intervals = monthlyWindows.map(w => w.interval).sort();
      expect(intervals).toEqual([2, 4, 6, 8, 10]);
    });

    it('should respect includeIntervals settings', () => {
      const today = new Date('2024-01-15T10:00:00.000Z');
      const settings = {
        ...DEFAULT_MEMORIES_SETTINGS,
        includeIntervals: {
          yearly: false,
          months_2_4_6_8_10: true,
        },
      };

      const windows = getMemoriesWindows(today, settings);

      const yearlyWindows = windows.filter(w => w.pattern === 'yearly');
      const monthlyWindows = windows.filter(w => w.pattern === 'monthly');
      
      expect(yearlyWindows).toHaveLength(0);
      expect(monthlyWindows).toHaveLength(5);
    });

    it('should handle leap year edge case for Feb 29', () => {
      const today = new Date('2024-02-29T10:00:00.000Z'); // Leap year
      const settings = { ...DEFAULT_MEMORIES_SETTINGS };

      const windows = getMemoriesWindows(today, settings);

      // Should not crash and should handle non-leap years correctly
      expect(windows.length).toBeGreaterThan(0);
    });

    it('should create windows with correct date ranges', () => {
      const today = new Date('2024-01-15T10:00:00.000Z');
      const settings = {
        ...DEFAULT_MEMORIES_SETTINGS,
        windowDays: {
          yearly: 3,
          monthly: 2,
        },
      };

      const windows = getMemoriesWindows(today, settings);
      const yearlyWindow = windows.find(w => w.pattern === 'yearly' && w.year === 2023);

      expect(yearlyWindow).toBeDefined();
      expect(yearlyWindow!.start).toEqual(new Date('2024-01-12T10:00:00.000Z'));
      expect(yearlyWindow!.end).toEqual(new Date('2024-01-18T10:00:00.000Z'));
    });
  });

  describe('selectMemories', () => {
    const mockItems: Item[] = [
      {
        id: '1',
        title: 'Memory 1',
        description: 'A great memory',
        content_url: 'https://example.com/1',
        source: 'screenshot' as const,
        platform: 'instagram',
        source_date: '2023-01-15T10:00:00.000Z',
        created_at: '2023-01-15T10:00:00.000Z',
        ingested_at: '2023-01-15T10:00:00.000Z',
        updated_at: '2023-01-15T10:00:00.000Z',
        ocr_done: false,
      },
      {
        id: '2',
        title: 'Memory 2',
        description: 'Another memory',
        content_url: 'https://example.com/2',
        source: 'url' as const,
        platform: 'youtube',
        source_date: '2023-01-16T10:00:00.000Z',
        created_at: '2023-01-16T10:00:00.000Z',
        ingested_at: '2023-01-16T10:00:00.000Z',
        updated_at: '2023-01-16T10:00:00.000Z',
        ocr_done: false,
      },
    ];

    it('should select memories within date windows', async () => {
      const today = new Date('2024-01-15T10:00:00.000Z');
      const windows: DateRange[] = [
        {
          start: new Date('2023-01-12T10:00:00.000Z'),
          end: new Date('2023-01-18T10:00:00.000Z'),
          pattern: 'yearly',
          year: 2023,
        },
      ];
      const settings = { ...DEFAULT_MEMORIES_SETTINGS };

      mockDb.getAllAsync.mockResolvedValue(mockItems);

      const memories = await selectMemories(windows, settings);

      expect(memories).toHaveLength(2);
      expect(memories[0]).toHaveProperty('memoryPattern', 'yearly');
      expect(memories[0]).toHaveProperty('memoryYear', 2023);
      expect(memories[0]).toHaveProperty('daysAgo');
    });

    it('should handle fallback to ingested_at when allowed', async () => {
      const today = new Date('2024-01-15T10:00:00.000Z');
      const windows: DateRange[] = [
        {
          start: new Date('2023-01-12T10:00:00.000Z'),
          end: new Date('2023-01-18T10:00:00.000Z'),
          pattern: 'yearly',
          year: 2023,
        },
      ];
      const settings = {
        ...DEFAULT_MEMORIES_SETTINGS,
        allowFallback: true,
      };

      const itemsWithoutSourceDate = mockItems.map(item => ({
        ...item,
        source_date: null,
      }));

      mockDb.getAllAsync.mockResolvedValue(itemsWithoutSourceDate);

      const memories = await selectMemories(windows, settings);

      expect(memories).toHaveLength(2);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('source_date IS NULL AND ingested_at'),
        expect.any(Array)
      );
    });

    it('should remove duplicate memories', async () => {
      const today = new Date('2024-01-15T10:00:00.000Z');
      const windows: DateRange[] = [
        {
          start: new Date('2023-01-12T10:00:00.000Z'),
          end: new Date('2023-01-18T10:00:00.000Z'),
          pattern: 'yearly',
          year: 2023,
        },
        {
          start: new Date('2023-01-13T10:00:00.000Z'),
          end: new Date('2023-01-17T10:00:00.000Z'),
          pattern: 'yearly',
          year: 2023,
        },
      ];
      const settings = { ...DEFAULT_MEMORIES_SETTINGS };

      // Mock database to return the same items for both windows
      mockDb.getAllAsync
        .mockResolvedValueOnce(mockItems)
        .mockResolvedValueOnce(mockItems);

      const memories = await selectMemories(windows, settings);

      // Should have only unique items despite overlapping windows
      expect(memories).toHaveLength(2);
      const uniqueIds = new Set(memories.map(m => m.id));
      expect(uniqueIds.size).toBe(2);
    });

    it('should sort memories by source_date', async () => {
      const today = new Date('2024-01-15T10:00:00.000Z');
      const windows: DateRange[] = [
        {
          start: new Date('2023-01-12T10:00:00.000Z'),
          end: new Date('2023-01-18T10:00:00.000Z'),
          pattern: 'yearly',
          year: 2023,
        },
      ];
      const settings = { ...DEFAULT_MEMORIES_SETTINGS };

      mockDb.getAllAsync.mockResolvedValue(mockItems);

      const memories = await selectMemories(windows, settings);

      // Should be sorted by source_date (most recent first)
      expect(memories[0].source_date).toBe('2023-01-16T10:00:00.000Z');
      expect(memories[1].source_date).toBe('2023-01-15T10:00:00.000Z');
    });

    it('should handle database errors gracefully', async () => {
      const today = new Date('2024-01-15T10:00:00.000Z');
      const windows: DateRange[] = [
        {
          start: new Date('2023-01-12T10:00:00.000Z'),
          end: new Date('2023-01-18T10:00:00.000Z'),
          pattern: 'yearly',
          year: 2023,
        },
      ];
      const settings = { ...DEFAULT_MEMORIES_SETTINGS };

      mockDb.getAllAsync.mockRejectedValue(new Error('Database error'));

      const memories = await selectMemories(windows, settings);

      expect(memories).toHaveLength(0);
    });
  });

  describe('groupMemoriesByPattern', () => {
    const mockMemories = [
      {
        id: '1',
        title: 'Memory 1',
        source: 'screenshot' as const,
        memoryPattern: 'yearly' as const,
        memoryYear: 2023,
        source_date: '2023-01-15T10:00:00.000Z',
        created_at: '2023-01-15T10:00:00.000Z',
        ingested_at: '2023-01-15T10:00:00.000Z',
        updated_at: '2023-01-15T10:00:00.000Z',
        ocr_done: false,
      },
      {
        id: '2',
        title: 'Memory 2',
        source: 'url' as const,
        memoryPattern: 'yearly' as const,
        memoryYear: 2022,
        source_date: '2022-01-15T10:00:00.000Z',
        created_at: '2022-01-15T10:00:00.000Z',
        ingested_at: '2022-01-15T10:00:00.000Z',
        updated_at: '2022-01-15T10:00:00.000Z',
        ocr_done: false,
      },
      {
        id: '3',
        title: 'Memory 3',
        source: 'screenshot' as const,
        memoryPattern: 'monthly' as const,
        memoryInterval: 2,
        source_date: '2023-11-15T10:00:00.000Z',
        created_at: '2023-11-15T10:00:00.000Z',
        ingested_at: '2023-11-15T10:00:00.000Z',
        updated_at: '2023-11-15T10:00:00.000Z',
        ocr_done: false,
      },
    ];

    it('should group memories by pattern correctly', () => {
      const grouped = groupMemoriesByPattern(mockMemories);

      expect(grouped.yearly['2023']).toHaveLength(1);
      expect(grouped.yearly['2022']).toHaveLength(1);
      expect(grouped.monthly['2 months ago']).toHaveLength(1);
    });

    it('should handle empty memories array', () => {
      const grouped = groupMemoriesByPattern([]);

      expect(grouped.yearly).toEqual({});
      expect(grouped.monthly).toEqual({});
    });
  });

  describe('isWithinQuietHours', () => {
    it('should detect same-day quiet hours', () => {
      const settings: MemoriesSettings = {
        ...DEFAULT_MEMORIES_SETTINGS,
        quietHours: { start: 22, end: 8 },
      };

      // Mock current time to be 23:00 (within quiet hours)
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(23);

      const isQuiet = isWithinQuietHours(settings);

      expect(isQuiet).toBe(true);
    });

    it('should detect overnight quiet hours', () => {
      const settings: MemoriesSettings = {
        ...DEFAULT_MEMORIES_SETTINGS,
        quietHours: { start: 22, end: 8 },
      };

      // Mock current time to be 02:00 (within overnight quiet hours)
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(2);

      const isQuiet = isWithinQuietHours(settings);

      expect(isQuiet).toBe(true);
    });

    it('should detect non-quiet hours', () => {
      const settings: MemoriesSettings = {
        ...DEFAULT_MEMORIES_SETTINGS,
        quietHours: { start: 22, end: 8 },
      };

      // Mock current time to be 10:00 (not within quiet hours)
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(10);

      const isQuiet = isWithinQuietHours(settings);

      expect(isQuiet).toBe(false);
    });
  });

  describe('getNextNotificationTime', () => {
    it('should calculate next daily notification', () => {
      const settings: MemoriesSettings = {
        ...DEFAULT_MEMORIES_SETTINGS,
        cadence: 'daily',
      };

      const nextTime = getNextNotificationTime(settings);

      expect(nextTime.getDate()).toBe(new Date().getDate() + 1);
      expect(nextTime.getHours()).toBe(9);
      expect(nextTime.getMinutes()).toBe(0);
    });

    it('should calculate next weekly notification', () => {
      const settings: MemoriesSettings = {
        ...DEFAULT_MEMORIES_SETTINGS,
        cadence: 'weekly',
      };

      const nextTime = getNextNotificationTime(settings);

      expect(nextTime.getDate()).toBe(new Date().getDate() + 7);
      expect(nextTime.getHours()).toBe(9);
      expect(nextTime.getMinutes()).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle month-end dates correctly', () => {
      const today = new Date('2024-01-31T10:00:00.000Z'); // Jan 31
      const settings = { ...DEFAULT_MEMORIES_SETTINGS };

      const windows = getMemoriesWindows(today, settings);
      const monthlyWindows = windows.filter(w => w.pattern === 'monthly');

      // Should not crash when going from Jan 31 to months that don't have 31 days
      expect(monthlyWindows.length).toBe(5);
    });

    it('should handle items without source_date', async () => {
      const today = new Date('2024-01-15T10:00:00.000Z');
      const windows: DateRange[] = [
        {
          start: new Date('2023-01-12T10:00:00.000Z'),
          end: new Date('2023-01-18T10:00:00.000Z'),
          pattern: 'yearly',
          year: 2023,
        },
      ];
      const settings = { ...DEFAULT_MEMORIES_SETTINGS };

      const itemsWithoutSourceDate = [
        {
          id: '1',
          title: 'Memory without source date',
          source_date: null,
          ingested_at: '2023-01-15T10:00:00.000Z',
          created_at: '2023-01-15T10:00:00.000Z',
          updated_at: '2023-01-15T10:00:00.000Z',
          ocr_done: false,
        },
      ];

      mockDb.getAllAsync.mockResolvedValue(itemsWithoutSourceDate);

      const memories = await selectMemories(windows, settings);

      expect(memories).toHaveLength(0); // Should be filtered out when allowFallback is false
    });
  });
});
