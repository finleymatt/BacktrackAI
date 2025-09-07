import { Item, TABLES } from '../../data/models';
import { getDatabase } from '../../data/db';

export interface DateRange {
  start: Date;
  end: Date;
  pattern: 'yearly' | 'monthly';
  interval?: number; // For monthly patterns: 2, 4, 6, 8, 10
  year?: number; // For yearly patterns
}

export interface MemoryItem extends Item {
  memoryPattern: 'yearly' | 'monthly';
  memoryInterval?: number;
  memoryYear?: number;
  daysAgo?: number;
}

export interface MemoriesSettings {
  cadence: 'daily' | 'weekly';
  quietHours: {
    start: number; // Hour (0-23)
    end: number;   // Hour (0-23)
  };
  includePrivate: boolean;
  includeIntervals: {
    yearly: boolean;
    months_2_4_6_8_10: boolean;
  };
  windowDays: {
    yearly: number;
    monthly: number;
  };
  allowFallback: boolean; // Use ingested_at if source_date is missing
  notifications: {
    enabled: boolean;
    weeklyDay?: number; // 0-6 (Sunday-Saturday) for weekly cadence
    weeklyTime?: { hour: number; minute: number }; // For weekly cadence
  };
}

export const DEFAULT_MEMORIES_SETTINGS: MemoriesSettings = {
  cadence: 'daily',
  quietHours: { start: 22, end: 8 },
  includePrivate: false,
  includeIntervals: {
    yearly: true,
    months_2_4_6_8_10: true,
  },
  windowDays: {
    yearly: 7,
    monthly: 3,
  },
  allowFallback: false,
  notifications: {
    enabled: true,
    weeklyDay: 1, // Monday
    weeklyTime: { hour: 9, minute: 0 },
  },
};

/**
 * Computes memory windows based on current date and settings
 */
export function getMemoriesWindows(today: Date, settings: MemoriesSettings): DateRange[] {
  const windows: DateRange[] = [];
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();

  // Yearly patterns: "On This Day" for each prior year
  if (settings.includeIntervals.yearly) {
    for (let year = currentYear - 1; year >= 2000; year--) { // Go back to year 2000
      const yearlyWindow = createYearlyWindow(today, year, settings.windowDays.yearly);
      windows.push(yearlyWindow);
    }
  }

  // Monthly patterns: 2, 4, 6, 8, 10 months ago
  if (settings.includeIntervals.months_2_4_6_8_10) {
    const monthIntervals = [2, 4, 6, 8, 10];
    for (const months of monthIntervals) {
      const monthlyWindow = createMonthlyWindow(today, months, settings.windowDays.monthly);
      windows.push(monthlyWindow);
    }
  }

  return windows;
}

/**
 * Creates a yearly memory window for a specific year
 */
function createYearlyWindow(today: Date, year: number, windowDays: number): DateRange {
  const targetDate = new Date(year, today.getMonth(), today.getDate());
  
  // Handle leap year edge case (Feb 29)
  if (today.getMonth() === 1 && today.getDate() === 29 && !isLeapYear(year)) {
    targetDate.setDate(28); // Use Feb 28 for non-leap years
  }

  const start = new Date(targetDate);
  start.setDate(start.getDate() - windowDays);
  
  const end = new Date(targetDate);
  end.setDate(end.getDate() + windowDays);

  return {
    start,
    end,
    pattern: 'yearly',
    year,
  };
}

/**
 * Creates a monthly memory window for N months ago
 */
function createMonthlyWindow(today: Date, monthsAgo: number, windowDays: number): DateRange {
  const targetDate = new Date(today);
  targetDate.setMonth(targetDate.getMonth() - monthsAgo);
  
  // Handle month-end gracefully (e.g., Jan 31 -> Feb 28/29)
  const originalDay = today.getDate();
  const lastDayOfTargetMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
  
  if (originalDay > lastDayOfTargetMonth) {
    targetDate.setDate(lastDayOfTargetMonth);
  }

  const start = new Date(targetDate);
  start.setDate(start.getDate() - windowDays);
  
  const end = new Date(targetDate);
  end.setDate(end.getDate() + windowDays);

  return {
    start,
    end,
    pattern: 'monthly',
    interval: monthsAgo,
  };
}

/**
 * Checks if a year is a leap year
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Selects memories based on computed windows
 */
export async function selectMemories(
  windows: DateRange[],
  settings: MemoriesSettings
): Promise<MemoryItem[]> {
  const database = await getDatabase();
  const memories: MemoryItem[] = [];

  for (const window of windows) {
    const windowMemories = await getMemoriesInWindow(database, window, settings);
    memories.push(...windowMemories);
  }

  // Remove duplicates (items that appear in multiple windows)
  const uniqueMemories = deduplicateMemories(memories);
  
  // Sort by source_date (most recent first)
  return uniqueMemories.sort((a, b) => {
    const dateA = a.source_date ? new Date(a.source_date) : new Date(a.ingested_at);
    const dateB = b.source_date ? new Date(b.source_date) : new Date(b.ingested_at);
    return dateB.getTime() - dateA.getTime();
  });
}

/**
 * Gets memories within a specific date window
 */
async function getMemoriesInWindow(
  database: any,
  window: DateRange,
  settings: MemoriesSettings
): Promise<MemoryItem[]> {
  const startISO = window.start.toISOString();
  const endISO = window.end.toISOString();

  let query = `
    SELECT * FROM ${TABLES.ITEMS}
    WHERE source_date IS NOT NULL
    AND source_date >= ? AND source_date <= ?
  `;

  const params: any[] = [startISO, endISO];

  // Add fallback to ingested_at if allowed
  if (settings.allowFallback) {
    query = `
      SELECT * FROM ${TABLES.ITEMS}
      WHERE (
        (source_date IS NOT NULL AND source_date >= ? AND source_date <= ?)
        OR (source_date IS NULL AND ingested_at >= ? AND ingested_at <= ?)
      )
    `;
    params.push(startISO, endISO, startISO, endISO);
  }

  // Filter out private items if needed
  if (!settings.includePrivate) {
    // For now, we'll assume all items are public unless we add a privacy field
    // This can be extended when privacy features are added
  }

  query += ' ORDER BY source_date DESC, ingested_at DESC';

  try {
    const results = await database.getAllAsync(query, params);
    
    return results.map((item: any) => ({
      ...item,
      memoryPattern: window.pattern,
      memoryInterval: window.interval,
      memoryYear: window.year,
      daysAgo: calculateDaysAgo(item.source_date || item.ingested_at),
    }));
  } catch (error) {
    console.error('Error querying memories:', error);
    return [];
  }
}

/**
 * Removes duplicate memories that appear in multiple windows
 */
function deduplicateMemories(memories: MemoryItem[]): MemoryItem[] {
  const seen = new Set<string>();
  const unique: MemoryItem[] = [];

  for (const memory of memories) {
    if (!seen.has(memory.id)) {
      seen.add(memory.id);
      unique.push(memory);
    }
  }

  return unique;
}

/**
 * Calculates days ago from a date string
 */
function calculateDaysAgo(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Groups memories by pattern and interval for display
 */
export function groupMemoriesByPattern(memories: MemoryItem[]): {
  yearly: { [year: string]: MemoryItem[] };
  monthly: { [interval: string]: MemoryItem[] };
} {
  const grouped = {
    yearly: {} as { [year: string]: MemoryItem[] },
    monthly: {} as { [interval: string]: MemoryItem[] },
  };

  for (const memory of memories) {
    if (memory.memoryPattern === 'yearly' && memory.memoryYear) {
      const yearKey = memory.memoryYear.toString();
      if (!grouped.yearly[yearKey]) {
        grouped.yearly[yearKey] = [];
      }
      grouped.yearly[yearKey].push(memory);
    } else if (memory.memoryPattern === 'monthly' && memory.memoryInterval) {
      const intervalKey = `${memory.memoryInterval} months ago`;
      if (!grouped.monthly[intervalKey]) {
        grouped.monthly[intervalKey] = [];
      }
      grouped.monthly[intervalKey].push(memory);
    }
  }

  return grouped;
}

/**
 * Checks if current time is within quiet hours
 */
export function isWithinQuietHours(settings: MemoriesSettings): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const { start, end } = settings.quietHours;

  if (start <= end) {
    // Same day quiet hours (e.g., 22:00 to 08:00)
    return currentHour >= start || currentHour < end;
  } else {
    // Overnight quiet hours (e.g., 22:00 to 08:00)
    return currentHour >= start || currentHour < end;
  }
}

/**
 * Gets the next memory notification time based on cadence
 */
export function getNextNotificationTime(settings: MemoriesSettings): Date {
  const now = new Date();
  const next = new Date(now);

  if (settings.cadence === 'daily') {
    next.setDate(next.getDate() + 1);
  } else {
    // Weekly
    next.setDate(next.getDate() + 7);
  }

  // Set to a reasonable time (e.g., 9 AM)
  next.setHours(9, 0, 0, 0);

  return next;
}
