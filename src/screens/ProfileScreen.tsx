import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Text, Card, Button } from '../components';
import { useTheme } from '../theme/ThemeContext';
import { signInWithEmail, signUpWithEmail, signOut, supabase } from '../lib/supabase';
import { getDatabase } from '../data/db';
import { ItemsRepository, FoldersRepository, TagsRepository } from '../data/repositories';
import { useSyncStatus, useSync, useAuthStatus, runAllSyncTests } from '../features/sync';
import { 
  loadMemoriesSettings, 
  saveMemoriesSettings, 
  MemoriesSettings,
  scheduleMemoriesNotifications,
  requestNotificationPermissions,
  areNotificationsEnabled,
  getScheduledNotifications
} from '../features/memories';

export const ProfileScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [memoriesSettings, setMemoriesSettings] = useState<MemoriesSettings | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  // Use sync hooks
  const { status: syncStatus, loading: syncStatusLoading, refreshStatus } = useSyncStatus();
  const { sync, isSyncing, lastSyncResult, error: syncError } = useSync();
  const { isAuthenticated, loading: authLoading, checkAuth } = useAuthStatus();

  // Load memories settings on mount
  useEffect(() => {
    loadMemoriesSettingsData();
  }, []);

  const loadMemoriesSettingsData = async () => {
    try {
      const settings = await loadMemoriesSettings();
      setMemoriesSettings(settings);
      
      const enabled = await areNotificationsEnabled();
      setNotificationsEnabled(enabled);
    } catch (error) {
      console.error('Failed to load memories settings:', error);
    }
  };

  // Remove the old checkAuthStatus function since we're using hooks now

  const handleSyncNow = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Not Authenticated',
        'Please sign in to Supabase first to enable cloud sync.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: handleSignIn }
        ]
      );
      return;
    }

    try {
      const result = await sync();
      
      if (result.success) {
        const message = `Sync completed successfully!\n\n` +
          `Items: ${result.itemsSynced}\n` +
          `Folders: ${result.foldersSynced}\n` +
          `Tags: ${result.tagsSynced}\n` +
          `Conflicts resolved: ${result.conflictsResolved}\n` +
          `Pushed: ${result.syncMetadata.pushed}\n` +
          `Pulled: ${result.syncMetadata.pulled}`;
        
        Alert.alert('Sync Successful', message, [{ text: 'OK' }]);
        
        // Refresh sync status
        await refreshStatus();
      } else {
        Alert.alert(
          'Sync Failed',
          `Sync completed with errors:\n\n${result.errors.join('\n')}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Sync Error',
        error instanceof Error ? error.message : 'Unknown error occurred',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSignIn = () => {
    Alert.prompt(
      'Sign In to Supabase',
      'Enter your email address:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Continue', 
          onPress: (email) => {
            if (email) {
              handleSignInWithEmail(email);
            }
          }
        }
      ],
      'plain-text',
      '',
      'email-address'
    );
  };

  const handleSignInWithEmail = (email: string) => {
    Alert.prompt(
      'Enter Password',
      `Password for ${email}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign In', 
          onPress: async (password) => {
            if (password) {
              try {
                console.log('Attempting to sign in with:', email);
                const result = await signInWithEmail(email, password);
                console.log('Sign in result:', result);
                Alert.alert('Success', 'Signed in successfully!');
                await checkAuth();
                await refreshStatus();
              } catch (error) {
                console.error('Sign in error:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                
                // If sign in fails, try to sign up instead
                if (errorMessage.includes('Invalid login credentials')) {
                  Alert.alert(
                    'User Not Found',
                    'No account found with this email. Would you like to create a new account?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Create Account', onPress: () => handleSignUp(email, password) }
                    ]
                  );
                } else {
                  Alert.alert('Sign In Failed', `Error: ${errorMessage}\n\nCheck console for details.`);
                }
              }
            }
          }
        }
      ],
      'secure-text'
    );
  };

  const handleSignUp = async (email: string, password: string) => {
    try {
      console.log('Attempting to sign up with:', email);
      const result = await signUpWithEmail(email, password, 'User');
      console.log('Sign up result:', result);
      Alert.alert('Success', 'Account created successfully! You are now signed in.');
      await checkAuth();
      await refreshStatus();
    } catch (error) {
      console.error('Sign up error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Sign Up Failed', `Error: ${errorMessage}\n\nCheck console for details.`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      Alert.alert('Success', 'Signed out successfully!');
      await checkAuth();
      await refreshStatus();
    } catch (error) {
      Alert.alert('Sign Out Failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const testConnection = async () => {
    try {
      console.log('Testing Supabase connection...');
      // Test basic connection with a simple query
      const { data, error } = await supabase.from('users').select('count').limit(1);
      if (error) {
        console.error('Connection test error:', error);
        Alert.alert('Connection Test Failed', `Error: ${error.message}`);
      } else {
        console.log('Connection test successful:', data);
        Alert.alert('Connection Test', 'Successfully connected to Supabase!');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      Alert.alert('Connection Test Failed', `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testAuth = async () => {
    try {
      console.log('Testing Supabase auth...');
      // Test auth endpoint
      const { data, error } = await supabase.auth.getSession();
      console.log('Auth test result:', { data, error });
      if (error) {
        Alert.alert('Auth Test Failed', `Auth error: ${error.message}`);
      } else {
        Alert.alert('Auth Test', 'Auth endpoint is accessible!');
      }
    } catch (error) {
      console.error('Auth test failed:', error);
      Alert.alert('Auth Test Failed', `Auth network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleToggleNotifications = async () => {
    if (!memoriesSettings) return;

    try {
      const newSettings = {
        ...memoriesSettings,
        notifications: {
          ...memoriesSettings.notifications,
          enabled: !memoriesSettings.notifications.enabled,
        },
      };

      await saveMemoriesSettings(newSettings);
      setMemoriesSettings(newSettings);

      if (newSettings.notifications.enabled) {
        // Request permissions if enabling
        const granted = await requestNotificationPermissions();
        if (granted) {
          await scheduleMemoriesNotifications(newSettings);
          setNotificationsEnabled(true);
          Alert.alert('Success', 'Notifications enabled and scheduled!');
        } else {
          // Revert if permissions denied
          const revertedSettings = {
            ...newSettings,
            notifications: { ...newSettings.notifications, enabled: false },
          };
          await saveMemoriesSettings(revertedSettings);
          setMemoriesSettings(revertedSettings);
          Alert.alert('Permission Required', 'Please enable notifications in your device settings.');
        }
      } else {
        // Cancel notifications if disabling
        const { cancelAllNotifications } = await import('../features/memories/notify');
        await cancelAllNotifications();
        setNotificationsEnabled(false);
        Alert.alert('Success', 'Notifications disabled and cancelled.');
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      Alert.alert('Error', 'Failed to update notification settings.');
    }
  };

  const handleChangeCadence = async () => {
    if (!memoriesSettings) return;

    const currentCadence = memoriesSettings.cadence;
    const newCadence = currentCadence === 'daily' ? 'weekly' : 'daily';

    Alert.alert(
      'Change Notification Cadence',
      `Switch from ${currentCadence} to ${newCadence} notifications?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: async () => {
            try {
              const newSettings = {
                ...memoriesSettings,
                cadence: newCadence,
              };

              await saveMemoriesSettings(newSettings);
              setMemoriesSettings(newSettings);

              if (newSettings.notifications.enabled) {
                await scheduleMemoriesNotifications(newSettings);
              }

              Alert.alert('Success', `Notifications changed to ${newCadence}.`);
            } catch (error) {
              console.error('Error changing cadence:', error);
              Alert.alert('Error', 'Failed to update notification cadence.');
            }
          },
        },
      ]
    );
  };

  const handleViewScheduledNotifications = async () => {
    try {
      const scheduled = await getScheduledNotifications();
      const count = scheduled.length;
      
      Alert.alert(
        'Scheduled Notifications',
        `You have ${count} scheduled notification${count === 1 ? '' : 's'}.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      Alert.alert('Error', 'Failed to get scheduled notifications.');
    }
  };

  const handleOpenPrivacy = () => {
    navigation.navigate('Privacy' as never);
  };

  const handleTestSync = async () => {
    try {
      Alert.alert(
        'Test Sync',
        'This will run comprehensive sync tests. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Run Tests',
            onPress: async () => {
              try {
                const results = await runAllSyncTests();
                const message = results.syncFunctionality.success 
                  ? 'Sync tests completed successfully! Check console for details.'
                  : `Sync tests failed: ${results.syncFunctionality.error}`;
                Alert.alert('Test Results', message, [{ text: 'OK' }]);
                await refreshStatus();
              } catch (error) {
                Alert.alert('Test Error', error instanceof Error ? error.message : 'Unknown error', [{ text: 'OK' }]);
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Test Error', error instanceof Error ? error.message : 'Unknown error', [{ text: 'OK' }]);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text variant="h1" style={styles.title}>
          Profile
        </Text>
        
        <Card style={styles.card}>
          <Text variant="body" style={styles.description}>
            Manage your profile settings, preferences, and account information. Customize your experience and privacy settings.
          </Text>
        </Card>

        {/* Privacy & Data Section */}
        <Card style={styles.card}>
          <Text variant="h3" style={styles.sectionTitle}>
            Privacy & Data
          </Text>
          
          <Text variant="body" style={styles.statusText}>
            Learn about what data we collect, how we use it, and your rights to control it.
          </Text>

          <Button
            title="View Privacy Policy"
            onPress={handleOpenPrivacy}
            variant="outline"
            size="small"
            style={styles.privacyButton}
          />
        </Card>

        {/* Memories Notifications Settings */}
        <Card style={styles.card}>
          <Text variant="h3" style={styles.sectionTitle}>
            Memories Notifications
          </Text>
          
          <Text variant="body" style={styles.statusText}>
            Status: {memoriesSettings?.notifications.enabled ? '✅ Enabled' : '❌ Disabled'}
          </Text>
          
          <Text variant="body" style={styles.statusText}>
            Cadence: {memoriesSettings?.cadence || 'daily'}
          </Text>
          
          <Text variant="body" style={styles.statusText}>
            Permissions: {notificationsEnabled ? '✅ Granted' : '❌ Not Granted'}
          </Text>

          <Button
            title={memoriesSettings?.notifications.enabled ? 'Disable Notifications' : 'Enable Notifications'}
            onPress={handleToggleNotifications}
            variant="outline"
            size="small"
            style={styles.notificationButton}
          />

          {memoriesSettings?.notifications.enabled && (
            <>
              <Button
                title={`Switch to ${memoriesSettings.cadence === 'daily' ? 'Weekly' : 'Daily'}`}
                onPress={handleChangeCadence}
                variant="outline"
                size="small"
                style={styles.cadenceButton}
              />

              <Button
                title="View Scheduled"
                onPress={handleViewScheduledNotifications}
                variant="outline"
                size="small"
                style={styles.scheduledButton}
              />
            </>
          )}
        </Card>

        {/* Dev-only sync section */}
        {(__DEV__ || true) && (
          <Card style={styles.card}>
            <Text variant="h3" style={styles.sectionTitle}>
              Cloud Sync (Dev Only)
            </Text>
            
            <Text variant="body" style={styles.statusText}>
              Status: {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
            </Text>

            <Button
              title="Refresh Status"
              onPress={async () => {
                await checkAuth();
                await refreshStatus();
              }}
              variant="outline"
              size="small"
              style={styles.refreshButton}
            />

            {isAuthenticated && (
              <Button
                title="Sign Out"
                onPress={handleSignOut}
                variant="outline"
                size="small"
                style={styles.signOutButton}
              />
            )}

            {syncStatus && (
              <View style={styles.statsContainer}>
                <Text variant="body" style={styles.statsText}>
                  Local Data: {syncStatus.localCounts.items} items, {syncStatus.localCounts.folders} folders, {syncStatus.localCounts.tags} tags
                </Text>
                <Text variant="body" style={styles.statsText}>
                  Pending Changes: {syncStatus.pendingChanges.items} items, {syncStatus.pendingChanges.folders} folders, {syncStatus.pendingChanges.tags} tags
                </Text>
                {syncStatus.lastSyncAt && (
                  <Text variant="body" style={styles.statsText}>
                    Last Sync: {new Date(syncStatus.lastSyncAt).toLocaleString()}
                  </Text>
                )}
              </View>
            )}

            <Button
              title="Test Connection"
              onPress={testConnection}
              variant="outline"
              size="small"
              style={styles.testButton}
            />

            <Button
              title="Test Auth"
              onPress={testAuth}
              variant="outline"
              size="small"
              style={styles.testButton}
            />

            <Button
              title={isSyncing ? 'Syncing...' : 'Sync Now'}
              onPress={handleSyncNow}
              disabled={isSyncing}
              style={styles.syncButton}
            />

            <Button
              title="Test Sync"
              onPress={handleTestSync}
              variant="outline"
              size="small"
              style={styles.testButton}
            />

            <Text variant="caption" style={styles.devNote}>
              This sync button is only visible in development mode.
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    marginBottom: 24,
    textAlign: 'center',
  },
  card: {
    marginBottom: 16,
  },
  description: {
    textAlign: 'center',
  },
  sectionTitle: {
    marginBottom: 12,
  },
  statusText: {
    marginBottom: 8,
  },
  statsContainer: {
    marginBottom: 16,
  },
  statsText: {
    fontSize: 14,
    opacity: 0.8,
  },
  syncButton: {
    marginBottom: 12,
  },
  devNote: {
    textAlign: 'center',
    opacity: 0.6,
    fontStyle: 'italic',
  },
  signOutButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  testButton: {
    marginBottom: 8,
  },
  refreshButton: {
    marginTop: 8,
    marginBottom: 8,
  },
  notificationButton: {
    marginTop: 8,
    marginBottom: 8,
  },
  cadenceButton: {
    marginBottom: 8,
  },
  scheduledButton: {
    marginBottom: 8,
  },
  privacyButton: {
    marginTop: 8,
    marginBottom: 8,
  },
});
