import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { 
  MemoriesSettings, 
  getMemoriesWindows, 
  selectMemories, 
  groupMemoriesByPattern,
  MemoryItem,
  loadMemoriesSettings 
} from './selectMemories';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface NotificationData {
  type: 'memories';
  filter?: 'yearly' | 'monthly';
  memoryId?: string;
}

/**
 * Requests notification permissions from the user
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permissions not granted');
      return false;
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('memories', {
        name: 'Memories',
        description: 'Notifications about your saved memories',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Schedules memories notifications based on settings
 */
export async function scheduleMemoriesNotifications(settings: MemoriesSettings): Promise<void> {
  try {
    // Cancel existing notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Check if notifications are enabled in settings
    if (!settings.notifications.enabled) {
      console.log('Notifications disabled in settings');
      return;
    }

    // Check if notifications are enabled
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Cannot schedule notifications: permissions not granted');
      return;
    }

    if (settings.cadence === 'daily') {
      await scheduleDailyNotifications(settings);
    } else {
      await scheduleWeeklyNotifications(settings);
    }

    console.log('Memories notifications scheduled successfully');
  } catch (error) {
    console.error('Error scheduling memories notifications:', error);
  }
}

/**
 * Schedules daily notifications
 */
async function scheduleDailyNotifications(settings: MemoriesSettings): Promise<void> {
  const trigger: Notifications.DailyTriggerInput = {
    hour: 9, // 9 AM
    minute: 0,
    repeats: true,
  };

  // Check if we're in quiet hours and adjust time
  const now = new Date();
  const currentHour = now.getHours();
  const { start, end } = settings.quietHours;

  // If current time is in quiet hours, schedule for after quiet hours end
  if (isWithinQuietHours(settings)) {
    trigger.hour = end;
    trigger.minute = 0;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Your Memories',
      body: 'Check out what happened on this day in previous years',
      data: { type: 'memories', filter: 'yearly' } as NotificationData,
      sound: true,
    },
    trigger,
  });
}

/**
 * Schedules weekly notifications
 */
async function scheduleWeeklyNotifications(settings: MemoriesSettings): Promise<void> {
  // Use settings or default to Monday at 9 AM
  const weekday = settings.notifications.weeklyDay ?? 1; // Monday
  const time = settings.notifications.weeklyTime ?? { hour: 9, minute: 0 };
  
  const trigger: Notifications.WeeklyTriggerInput = {
    weekday,
    hour: time.hour,
    minute: time.minute,
    repeats: true,
  };

  // Check if we're in quiet hours and adjust time
  if (isWithinQuietHours(settings)) {
    trigger.hour = settings.quietHours.end;
    trigger.minute = 0;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Your Memories',
      body: 'Check out your memories from this week',
      data: { type: 'memories', filter: 'yearly' } as NotificationData,
      sound: true,
    },
    trigger,
  });
}

/**
 * Checks if current time is within quiet hours
 */
function isWithinQuietHours(settings: MemoriesSettings): boolean {
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
 * Triggers a test notification immediately (for Expo Go testing)
 */
export async function triggerMemoriesTestNow(): Promise<void> {
  try {
    const settings = await loadMemoriesSettings();
    const memories = await getMemoriesForNotification(settings);

    if (memories.length === 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Memories Test',
          body: 'No memories found for today. Try creating some test data!',
          data: { type: 'memories' } as NotificationData,
          sound: true,
        },
        trigger: null, // Show immediately
      });
      return;
    }

    // Group memories and create notification
    const grouped = groupMemoriesByPattern(memories);
    const yearlyCount = Object.values(grouped.yearly).flat().length;
    const monthlyCount = Object.values(grouped.monthly).flat().length;

    let body = '';
    if (yearlyCount > 0 && monthlyCount > 0) {
      body = `Found ${yearlyCount} yearly and ${monthlyCount} monthly memories`;
    } else if (yearlyCount > 0) {
      body = `Found ${yearlyCount} memories from this day in previous years`;
    } else if (monthlyCount > 0) {
      body = `Found ${monthlyCount} memories from 2,4,6,8,10 months ago`;
    }

    // Show the first memory as an example
    const firstMemory = memories[0];
    if (firstMemory) {
      const timeAgo = getTimeAgoText(firstMemory);
      body += `\n\nExample: "${firstMemory.title || 'Untitled'}" ${timeAgo}`;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Memories Test',
        body,
        data: { type: 'memories' } as NotificationData,
        sound: true,
      },
      trigger: null, // Show immediately
    });

    console.log('Test notification triggered successfully');
  } catch (error) {
    console.error('Error triggering test notification:', error);
  }
}

/**
 * Gets memories for notification based on current date and settings
 */
async function getMemoriesForNotification(settings: MemoriesSettings): Promise<MemoryItem[]> {
  try {
    const today = new Date();
    const windows = getMemoriesWindows(today, settings);
    const memories = await selectMemories(windows, settings);
    
    // Limit to top 5 memories to avoid overwhelming notifications
    return memories.slice(0, 5);
  } catch (error) {
    console.error('Error getting memories for notification:', error);
    return [];
  }
}

/**
 * Gets human-readable time ago text for a memory
 */
function getTimeAgoText(memory: MemoryItem): string {
  if (memory.memoryPattern === 'yearly' && memory.memoryYear) {
    const currentYear = new Date().getFullYear();
    const yearsAgo = currentYear - memory.memoryYear;
    return `${yearsAgo} year${yearsAgo === 1 ? '' : 's'} ago`;
  } else if (memory.memoryPattern === 'monthly' && memory.memoryInterval) {
    return `${memory.memoryInterval} months ago`;
  } else if (memory.daysAgo) {
    if (memory.daysAgo < 30) {
      return `${memory.daysAgo} days ago`;
    } else if (memory.daysAgo < 365) {
      const months = Math.floor(memory.daysAgo / 30);
      return `${months} month${months === 1 ? '' : 's'} ago`;
    } else {
      const years = Math.floor(memory.daysAgo / 365);
      return `${years} year${years === 1 ? '' : 's'} ago`;
    }
  }
  return 'recently';
}

/**
 * Handles notification response (when user taps notification)
 */
export function handleNotificationResponse(response: Notifications.NotificationResponse): void {
  const data = response.notification.request.content.data as NotificationData;
  
  if (data.type === 'memories') {
    // Navigate to Memories screen with optional filter
    // This will be handled by the navigation system
    console.log('Navigating to memories with filter:', data.filter);
    
    // Store the filter preference for the MemoriesScreen to pick up
    if (data.filter) {
      // We'll use AsyncStorage to pass the filter to the screen
      import('@react-native-async-storage/async-storage').then(({ default: AsyncStorage }) => {
        AsyncStorage.setItem('memories_notification_filter', data.filter!);
      });
    }
  }
}

/**
 * Gets all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

/**
 * Cancels all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('All notifications cancelled');
  } catch (error) {
    console.error('Error cancelling notifications:', error);
  }
}

/**
 * Checks if notifications are enabled
 */
export async function areNotificationsEnabled(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking notification permissions:', error);
    return false;
  }
}
