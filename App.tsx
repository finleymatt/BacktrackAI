import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from './src/theme/ThemeContext';
import { AppNavigator } from './src/navigation';
import { initDatabase } from './src/data';
import { 
  requestNotificationPermissions, 
  scheduleMemoriesNotifications, 
  loadMemoriesSettings,
  handleNotificationResponse 
} from './src/features/memories';
import * as Notifications from 'expo-notifications';

export default function App() {
  useEffect(() => {
    // Initialize database on app start (non-blocking)
    initDatabase().catch((error) => {
      console.error('Failed to initialize database:', error);
    });

    // Initialize notifications
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    try {
      // Request permissions
      const granted = await requestNotificationPermissions();
      if (!granted) {
        console.log('Notification permissions not granted');
        return;
      }

      // Load settings and schedule notifications
      const settings = await loadMemoriesSettings();
      await scheduleMemoriesNotifications(settings);

      // Set up notification response handler
      const subscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
      
      // Cleanup subscription on unmount
      return () => subscription.remove();
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  };

  return (
    <ThemeProvider>
      <AppNavigator />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
