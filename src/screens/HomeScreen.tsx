import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Button } from '../components';
import { useTheme } from '../theme/ThemeContext';
import { getDatabaseStats, DatabaseStats } from '../data';
import { seedDatabase } from '../data/seed';
import { 
  getOcrConfig, 
  setOcrConfig, 
  getOcrProcessingStatus, 
  processAllPendingOcr,
  processScreenshotOcr,
  cleanupOrphanedScreenshots,
  getScreenshotOcrStatus,
  reprocessAllScreenshotOcr
} from '../features/ingest';
import { resetDatabase } from '../data/db';

export const HomeScreen: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [ocrConfig, setOcrConfigState] = useState(getOcrConfig());
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<{
    total: number;
    withOcr: number;
    withoutOcr: number;
  } | null>(null);
  const [processingStatus, setProcessingStatus] = useState<{
    isProcessing: boolean;
    current: number;
    total: number;
    currentItem?: string;
  }>({
    isProcessing: false,
    current: 0,
    total: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const databaseStats = await getDatabaseStats();
      setStats(databaseStats);
      
      // Also load OCR status
      const ocrStatusData = await getScreenshotOcrStatus();
      setOcrStatus({
        total: ocrStatusData.total,
        withOcr: ocrStatusData.withOcr,
        withoutOcr: ocrStatusData.withoutOcr
      });
    } catch (error) {
      console.error('Failed to load database stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDatabase = async () => {
    try {
      setLoading(true);
      await seedDatabase();
      await loadStats(); // Reload stats after seeding
    } catch (error) {
      console.error('Failed to seed database:', error);
    }
  };

  const handleToggleOcr = () => {
    const newConfig = { ...ocrConfig, enabled: !ocrConfig.enabled };
    setOcrConfig(newConfig);
    setOcrConfigState(newConfig);
  };

  const handleToggleOcrMode = () => {
    const newMode = ocrConfig.mode === 'demo' ? 'expo-text-recognition' : 'demo';
    const newConfig = { ...ocrConfig, mode: newMode };
    setOcrConfig(newConfig);
    setOcrConfigState(newConfig);
  };

  const handleProcessOcr = async () => {
    try {
      setOcrProcessing(true);
      setProcessingStatus({
        isProcessing: true,
        current: 0,
        total: 0,
      });

      const result = await processScreenshotOcr((progress) => {
        setProcessingStatus({
          isProcessing: true,
          current: progress.current,
          total: progress.total,
          currentItem: progress.currentItem,
        });
      });

      setProcessingStatus({ isProcessing: false, current: 0, total: 0 });
      Alert.alert(
        'OCR Processing Complete',
        `Processed: ${result.processed} items\nFailed: ${result.failed} items`
      );
      await loadStats(); // Reload stats to show updated counts
    } catch (error) {
      console.error('OCR processing failed:', error);
      setProcessingStatus({ isProcessing: false, current: 0, total: 0 });
      Alert.alert('Error', 'Failed to process OCR. Check console for details.');
    } finally {
      setOcrProcessing(false);
    }
  };

  const handleReprocessOcr = async () => {
    Alert.alert(
      'Reprocess All OCR',
      'This will reprocess OCR for all screenshots, even those that already have OCR text. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reprocess',
          onPress: async () => {
            try {
              setOcrProcessing(true);
              setProcessingStatus({
                isProcessing: true,
                current: 0,
                total: 0,
              });

              const result = await reprocessAllScreenshotOcr((progress) => {
                setProcessingStatus({
                  isProcessing: true,
                  current: progress.current,
                  total: progress.total,
                  currentItem: progress.currentItem,
                });
              });

              setProcessingStatus({ isProcessing: false, current: 0, total: 0 });
              Alert.alert(
                'OCR Reprocessing Complete',
                `Processed: ${result.processed} items\nFailed: ${result.failed} items`
              );
              await loadStats(); // Reload stats to show updated counts
            } catch (error) {
              console.error('OCR reprocessing failed:', error);
              setProcessingStatus({ isProcessing: false, current: 0, total: 0 });
              Alert.alert('Error', 'Failed to reprocess OCR. Check console for details.');
            } finally {
              setOcrProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleResetDatabase = async () => {
    Alert.alert(
      'Reset Database',
      'This will delete all data and start fresh. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await resetDatabase();
              await loadStats();
              Alert.alert('Success', 'Database has been reset');
            } catch (error) {
              console.error('Failed to reset database:', error);
              Alert.alert('Error', 'Failed to reset database');
            }
          },
        },
      ]
    );
  };

  const handleCleanupOrphaned = async () => {
    try {
      setLoading(true);
      const cleanedCount = await cleanupOrphanedScreenshots();
      await loadStats();
      Alert.alert(
        'Cleanup Complete',
        `Removed ${cleanedCount} orphaned screenshot items from database`
      );
    } catch (error) {
      console.error('Failed to cleanup orphaned items:', error);
      Alert.alert('Error', 'Failed to cleanup orphaned items');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text variant="h1" style={styles.title}>
          Home
        </Text>
        
        <Card style={styles.card}>
          <Text variant="body" style={styles.description}>
            Welcome to your content organizer! This is the home screen where you can view your recent activity and quick actions.
          </Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text variant="caption" style={styles.loadingText}>
                Loading database...
              </Text>
            </View>
          ) : stats ? (
            <View style={styles.statsContainer}>
              <View style={styles.statRow}>
                <Text variant="h3" style={styles.statNumber}>
                  {stats.totalItems}
                </Text>
                <Text variant="body" style={styles.statLabel}>
                  Total Items
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text variant="h3" style={styles.statNumber}>
                  {stats.totalFolders}
                </Text>
                <Text variant="body" style={styles.statLabel}>
                  Folders
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text variant="h3" style={styles.statNumber}>
                  {stats.totalTags}
                </Text>
                <Text variant="body" style={styles.statLabel}>
                  Tags
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text variant="h3" style={styles.statNumber}>
                  {stats.recentItems}
                </Text>
                <Text variant="body" style={styles.statLabel}>
                  Recent (7 days)
                </Text>
              </View>
            </View>
          ) : (
            <Text variant="body" style={styles.errorText}>
              Failed to load database statistics
            </Text>
          )}
          
          <View style={styles.buttonContainer}>
            <Button
              title="Seed Database (Dev)"
              variant="outline"
              onPress={handleSeedDatabase}
              style={[styles.button, styles.seedButton]}
            />
            <Button
              title="Reset Database (Dev)"
              variant="outline"
              onPress={handleResetDatabase}
              style={[styles.button, styles.resetButton]}
            />
            <Button
              title="Cleanup Orphaned (Dev)"
              variant="outline"
              onPress={handleCleanupOrphaned}
              style={[styles.button, styles.cleanupButton]}
            />
            <Button
              title="Toggle Theme"
              variant="outline"
              onPress={toggleTheme}
              style={styles.button}
            />
          </View>
        </Card>

        {/* OCR Management Section */}
        <Card style={styles.card}>
          <Text variant="h3" style={styles.sectionTitle}>
            OCR Settings
          </Text>
          
          <View style={styles.ocrStatusContainer}>
            <Text variant="body" style={styles.ocrStatus}>
              Status: {ocrConfig.enabled ? '✅ Enabled' : '❌ Disabled'}
            </Text>
            <Text variant="body" style={styles.ocrStatus}>
              Mode: {ocrConfig.mode === 'demo' ? '🎭 Demo (Mock)' : '🔍 Real OCR'}
            </Text>
            {ocrStatus && (
              <>
                <Text variant="body" style={styles.ocrStatus}>
                  Screenshots: {ocrStatus.total} total
                </Text>
                <Text variant="body" style={styles.ocrStatus}>
                  OCR Status: {ocrStatus.withOcr} with OCR, {ocrStatus.withoutOcr} without
                </Text>
              </>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title={ocrConfig.enabled ? 'Disable OCR' : 'Enable OCR'}
              variant="outline"
              onPress={handleToggleOcr}
              style={[styles.button, ocrConfig.enabled ? styles.disableButton : styles.enableButton]}
            />
            <Button
              title={`Switch to ${ocrConfig.mode === 'demo' ? 'Real OCR' : 'Demo Mode'}`}
              variant="outline"
              onPress={handleToggleOcrMode}
              style={styles.button}
            />
          </View>

          {ocrConfig.enabled && (
            <View style={styles.buttonContainer}>
              <Button
                title={ocrProcessing ? 'Processing...' : 'Process Screenshot OCR'}
                variant="primary"
                onPress={handleProcessOcr}
                disabled={ocrProcessing}
                style={[styles.button, styles.processButton]}
              />
              <Button
                title={ocrProcessing ? 'Processing...' : 'Reprocess All OCR'}
                variant="outline"
                onPress={handleReprocessOcr}
                disabled={ocrProcessing}
                style={[styles.button, styles.reprocessButton]}
              />
            </View>
          )}

          {/* Real-time Progress Indicator */}
          {processingStatus.isProcessing && (
            <Card style={styles.progressCard}>
              <Text variant="h4" style={styles.progressTitle}>
                🔄 Processing OCR...
              </Text>
              
              <View style={styles.progressInfo}>
                <Text variant="body" style={styles.progressText}>
                  {processingStatus.current} of {processingStatus.total} items
                </Text>
                <Text variant="caption" style={styles.progressPercentage}>
                  {processingStatus.total > 0 ? Math.round((processingStatus.current / processingStatus.total) * 100) : 0}% complete
                </Text>
              </View>

              {processingStatus.currentItem && (
                <Text variant="caption" style={styles.currentItemText} numberOfLines={2}>
                  📄 {processingStatus.currentItem}
                </Text>
              )}

              {/* Simple progress bar */}
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { 
                  width: processingStatus.total > 0 ? `${(processingStatus.current / processingStatus.total) * 100}%` : '0%',
                  backgroundColor: theme.colors.primary 
                }]} />
              </View>
            </Card>
          )}

          <Text variant="caption" style={styles.ocrHint}>
            💡 OCR extracts text from screenshots to make them searchable. Demo mode works in Expo Go, real OCR requires a development build.
          </Text>
        </Card>

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
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingText: {
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statRow: {
    alignItems: 'center',
    marginBottom: 12,
    minWidth: 80,
  },
  statNumber: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    textAlign: 'center',
    opacity: 0.7,
  },
  errorText: {
    textAlign: 'center',
    color: 'red',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  button: {
    marginHorizontal: 8,
    marginVertical: 4,
  },
  seedButton: {
    backgroundColor: '#4CAF50',
  },
  resetButton: {
    backgroundColor: '#FF9800',
  },
  cleanupButton: {
    backgroundColor: '#9C27B0',
  },
  sectionTitle: {
    marginBottom: 12,
    textAlign: 'center',
  },
  ocrStatusContainer: {
    marginBottom: 16,
  },
  ocrStatus: {
    marginBottom: 4,
    textAlign: 'center',
  },
  enableButton: {
    backgroundColor: '#4CAF50',
  },
  disableButton: {
    backgroundColor: '#F44336',
  },
  processButton: {
    backgroundColor: '#2196F3',
  },
  reprocessButton: {
    backgroundColor: '#FF5722',
  },
  ocrHint: {
    textAlign: 'center',
    marginTop: 12,
    opacity: 0.7,
  },
  progressCard: {
    marginTop: 16,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderColor: '#2196F3',
    borderWidth: 1,
  },
  progressTitle: {
    textAlign: 'center',
    marginBottom: 12,
    color: '#2196F3',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontWeight: 'bold',
  },
  progressPercentage: {
    opacity: 0.8,
  },
  currentItemText: {
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
});
