import AsyncStorage from '@react-native-async-storage/async-storage';
import { MemoriesSettings, DEFAULT_MEMORIES_SETTINGS } from './selectMemories';

const MEMORIES_SETTINGS_KEY = 'memories_settings';

/**
 * Loads memories settings from AsyncStorage
 */
export async function loadMemoriesSettings(): Promise<MemoriesSettings> {
  try {
    const stored = await AsyncStorage.getItem(MEMORIES_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all fields exist
      return { ...DEFAULT_MEMORIES_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error('Error loading memories settings:', error);
  }
  
  return DEFAULT_MEMORIES_SETTINGS;
}

/**
 * Saves memories settings to AsyncStorage
 */
export async function saveMemoriesSettings(settings: MemoriesSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(MEMORIES_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving memories settings:', error);
    throw error;
  }
}

/**
 * Updates specific memories settings
 */
export async function updateMemoriesSettings(updates: Partial<MemoriesSettings>): Promise<MemoriesSettings> {
  const current = await loadMemoriesSettings();
  const updated = { ...current, ...updates };
  await saveMemoriesSettings(updated);
  return updated;
}

/**
 * Resets memories settings to defaults
 */
export async function resetMemoriesSettings(): Promise<MemoriesSettings> {
  await saveMemoriesSettings(DEFAULT_MEMORIES_SETTINGS);
  return DEFAULT_MEMORIES_SETTINGS;
}

/**
 * Validates memories settings
 */
export function validateMemoriesSettings(settings: MemoriesSettings): string[] {
  const errors: string[] = [];

  // Validate cadence
  if (!['daily', 'weekly'].includes(settings.cadence)) {
    errors.push('Cadence must be "daily" or "weekly"');
  }

  // Validate quiet hours
  if (settings.quietHours.start < 0 || settings.quietHours.start > 23) {
    errors.push('Quiet hours start must be between 0 and 23');
  }
  if (settings.quietHours.end < 0 || settings.quietHours.end > 23) {
    errors.push('Quiet hours end must be between 0 and 23');
  }

  // Validate window days
  if (settings.windowDays.yearly < 0 || settings.windowDays.yearly > 30) {
    errors.push('Yearly window days must be between 0 and 30');
  }
  if (settings.windowDays.monthly < 0 || settings.windowDays.monthly > 14) {
    errors.push('Monthly window days must be between 0 and 14');
  }

  // Validate include intervals
  if (typeof settings.includeIntervals.yearly !== 'boolean') {
    errors.push('Include intervals yearly must be a boolean');
  }
  if (typeof settings.includeIntervals.months_2_4_6_8_10 !== 'boolean') {
    errors.push('Include intervals months_2_4_6_8_10 must be a boolean');
  }

  // Validate include private
  if (typeof settings.includePrivate !== 'boolean') {
    errors.push('Include private must be a boolean');
  }

  // Validate allow fallback
  if (typeof settings.allowFallback !== 'boolean') {
    errors.push('Allow fallback must be a boolean');
  }

  // Validate notifications
  if (typeof settings.notifications.enabled !== 'boolean') {
    errors.push('Notifications enabled must be a boolean');
  }

  if (settings.notifications.weeklyDay !== undefined) {
    if (settings.notifications.weeklyDay < 0 || settings.notifications.weeklyDay > 6) {
      errors.push('Weekly day must be between 0 and 6');
    }
  }

  if (settings.notifications.weeklyTime) {
    if (settings.notifications.weeklyTime.hour < 0 || settings.notifications.weeklyTime.hour > 23) {
      errors.push('Weekly time hour must be between 0 and 23');
    }
    if (settings.notifications.weeklyTime.minute < 0 || settings.notifications.weeklyTime.minute > 59) {
      errors.push('Weekly time minute must be between 0 and 59');
    }
  }

  return errors;
}

/**
 * Gets a human-readable description of the settings
 */
export function getMemoriesSettingsDescription(settings: MemoriesSettings): string {
  const parts: string[] = [];

  // Cadence
  parts.push(`Notifications: ${settings.cadence}`);

  // Quiet hours
  const startHour = settings.quietHours.start.toString().padStart(2, '0');
  const endHour = settings.quietHours.end.toString().padStart(2, '0');
  parts.push(`Quiet hours: ${startHour}:00 - ${endHour}:00`);

  // Intervals
  const intervals: string[] = [];
  if (settings.includeIntervals.yearly) {
    intervals.push('yearly');
  }
  if (settings.includeIntervals.months_2_4_6_8_10) {
    intervals.push('2,4,6,8,10 months');
  }
  parts.push(`Intervals: ${intervals.join(', ') || 'none'}`);

  // Window days
  parts.push(`Windows: ±${settings.windowDays.yearly}d yearly, ±${settings.windowDays.monthly}d monthly`);

  // Privacy
  if (settings.includePrivate) {
    parts.push('Includes private items');
  }

  // Fallback
  if (settings.allowFallback) {
    parts.push('Uses ingestion date as fallback');
  }

  // Notifications
  if (settings.notifications.enabled) {
    parts.push('Notifications enabled');
  } else {
    parts.push('Notifications disabled');
  }

  return parts.join(' • ');
}

/**
 * Creates a settings object with safe defaults for testing
 */
export function createTestMemoriesSettings(): MemoriesSettings {
  return {
    cadence: 'daily',
    quietHours: { start: 22, end: 8 },
    includePrivate: true, // Include all items for testing
    includeIntervals: {
      yearly: true,
      months_2_4_6_8_10: true,
    },
    windowDays: {
      yearly: 7,
      monthly: 3,
    },
    allowFallback: true, // Allow fallback for testing
    notifications: {
      enabled: true,
      weeklyDay: 1,
      weeklyTime: { hour: 9, minute: 0 },
    },
  };
}
