import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Button } from '../components';
import { useTheme } from '../theme/ThemeContext';
import { SyncService } from '../lib/sync';

export const ProfileScreen: React.FC = () => {
  const { theme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    localCounts: { items: number; folders: number; tags: number };
  } | null>(null);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const isAuth = await SyncService.isAuthenticated();
      setIsAuthenticated(isAuth);
      
      if (isAuth) {
        const status = await SyncService.getSyncStatus();
        setSyncStatus(status);
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
    }
  };

  const handleSyncNow = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Not Authenticated',
        'Please sign in to Supabase first to enable cloud sync.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsSyncing(true);
    try {
      const result = await SyncService.syncAll();
      
      if (result.success) {
        Alert.alert(
          'Sync Successful',
          `Synced ${result.itemsSynced} items, ${result.foldersSynced} folders, and ${result.tagsSynced} tags.`,
          [{ text: 'OK' }]
        );
        // Refresh sync status
        await checkAuthStatus();
      } else {
        Alert.alert(
          'Sync Failed',
          `Errors: ${result.errors.join(', ')}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Sync Error',
        error instanceof Error ? error.message : 'Unknown error occurred',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text variant="h1" style={styles.title}>
          Profile
        </Text>
        
        <Card style={styles.card}>
          <Text variant="body" style={styles.description}>
            Manage your profile settings, preferences, and account information. Customize your experience and privacy settings.
          </Text>
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

            {syncStatus && (
              <View style={styles.statsContainer}>
                <Text variant="body" style={styles.statsText}>
                  Local Data: {syncStatus.localCounts.items} items, {syncStatus.localCounts.folders} folders, {syncStatus.localCounts.tags} tags
                </Text>
              </View>
            )}

            <Button
              title={isSyncing ? 'Syncing...' : 'Sync Now'}
              onPress={handleSyncNow}
              disabled={isSyncing}
              style={styles.syncButton}
            />

            <Text variant="caption" style={styles.devNote}>
              This sync button is only visible in development mode.
            </Text>
          </Card>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
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
});
