import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
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
  reprocessAllScreenshotOcr,
  processPendingScreenshotOCR,
  getOcrQueueStatus,
  debugPhotoLibrary
} from '../features/ingest';
import { resetDatabase, forceResetDatabase, fixScreenshotConstraint } from '../data/db';

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
  const [ocrQueueStatus, setOcrQueueStatus] = useState<{
    pending: number;
    done: number;
    error: number;
    total: number;
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
      
      // Load OCR queue status
      const queueStatus = await getOcrQueueStatus();
      setOcrQueueStatus(queueStatus);
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
    const newMode: 'demo' | 'expo-text-recognition' = ocrConfig.mode === 'demo' ? 'expo-text-recognition' : 'demo';
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

      // Check if there are any pending items first
      const queueStatus = await getOcrQueueStatus();
      if (queueStatus.pending === 0) {
        Alert.alert(
          'No Pending Screenshots',
          'No pending screenshots to process. Import some screenshots first using the Add screen.'
        );
        setProcessingStatus({ isProcessing: false, current: 0, total: 0 });
        return;
      }

      // Process in batches with progress updates
      let totalProcessed = 0;
      let totalRemaining = queueStatus.pending;
      const maxBatches = 5; // Safety cap to keep UI responsive
      
      for (let batch = 0; batch < maxBatches && totalRemaining > 0; batch++) {
        setProcessingStatus({
          isProcessing: true,
          current: totalProcessed,
          total: queueStatus.pending,
          currentItem: `Processing batch ${batch + 1}/${maxBatches}...`,
        });

        const result = await processPendingScreenshotOCR({
          batchSize: 10,
          maxBatchesPerRun: 1
        });

        totalProcessed += result.processed;
        totalRemaining = result.remaining;

        // Small delay between batches
        if (totalRemaining > 0 && batch < maxBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setProcessingStatus({ isProcessing: false, current: 0, total: 0 });
      
      const message = totalRemaining > 0 
        ? `OCR processing paused: ${totalProcessed} items processed, ${totalRemaining} remaining. Press the button again to continue.`
        : `OCR complete: ${totalProcessed} items processed.`;
        
      Alert.alert('OCR Processing Complete', message);
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

  const handleForceResetDatabase = async () => {
    Alert.alert(
      'Force Reset Database',
      'This will completely delete the database file and recreate it. Use this if you\'re experiencing database locking issues. All data will be lost. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Force Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await forceResetDatabase();
              await loadStats();
              Alert.alert('Success', 'Database has been force reset');
            } catch (error) {
              console.error('Failed to force reset database:', error);
              Alert.alert('Error', 'Failed to force reset database');
            }
          },
        },
      ]
    );
  };

  const handleTestScreenshotConstraint = async () => {
    try {
      const { ItemsRepository } = await import('../data/repositories/items');
      
      // Try to create a test item with source='screenshot'
      const testItem = await ItemsRepository.create({
        title: 'Test Screenshot',
        description: 'Testing screenshot constraint',
        source: 'screenshot',
        ocr_status: 'pending'
      });
      
      // Clean up the test item
      await ItemsRepository.delete(testItem.id);
      
      Alert.alert('Success', 'Screenshot constraint is working correctly!');
    } catch (error) {
      console.error('Screenshot constraint test failed:', error);
      Alert.alert('Error', `Screenshot constraint test failed: ${error}`);
    }
  };

  const handleFixScreenshotConstraint = async () => {
    Alert.alert(
      'Fix Screenshot Constraint',
      'This will recreate the items table with the correct constraint to allow screenshot sources. Your data will be preserved. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Fix Constraint',
          onPress: async () => {
            try {
              setLoading(true);
              await fixScreenshotConstraint();
              await loadStats();
              Alert.alert('Success', 'Screenshot constraint has been fixed!');
            } catch (error) {
              console.error('Failed to fix screenshot constraint:', error);
              Alert.alert('Error', 'Failed to fix screenshot constraint');
            } finally {
              setLoading(false);
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

  const handleDebugPhotoLibrary = async () => {
    try {
      console.log('🔍 Debugging photo library...');
      await debugPhotoLibrary(20);
      Alert.alert(
        'Debug Complete',
        'Check the console logs to see what\'s in your photo library. Look for the 📸 section.'
      );
    } catch (error) {
      console.error('Failed to debug photo library:', error);
      Alert.alert('Error', 'Failed to debug photo library');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
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
          
          <View style={styles.buttonSection}>
            <Text variant="caption" style={styles.sectionLabel}>Database Management</Text>
            <View style={styles.buttonContainer}>
              <Button
                title="Seed DB"
                variant="outline"
                onPress={handleSeedDatabase}
                style={[styles.button, styles.seedButton]}
              />
              <Button
                title="Reset DB"
                variant="outline"
                onPress={handleResetDatabase}
                style={[styles.button, styles.resetButton]}
              />
              <Button
                title="Force Reset"
                variant="outline"
                onPress={handleForceResetDatabase}
                style={[styles.button, styles.forceResetButton]}
              />
            </View>
          </View>

          <View style={styles.buttonSection}>
            <Text variant="caption" style={styles.sectionLabel}>Screenshot Tools</Text>
            <View style={styles.buttonContainer}>
              <Button
                title="Test Constraint"
                variant="outline"
                onPress={handleTestScreenshotConstraint}
                style={[styles.button, styles.testButton]}
              />
              <Button
                title="Fix Constraint"
                variant="outline"
                onPress={handleFixScreenshotConstraint}
                style={[styles.button, styles.fixButton]}
              />
              <Button
                title="Debug Photos"
                variant="outline"
                onPress={handleDebugPhotoLibrary}
                style={[styles.button, styles.debugButton]}
              />
            </View>
          </View>

          <View style={styles.buttonSection}>
            <Text variant="caption" style={styles.sectionLabel}>Utilities</Text>
            <View style={styles.buttonContainer}>
              <Button
                title="Cleanup"
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
            {ocrQueueStatus && (
              <>
                <Text variant="body" style={styles.ocrStatus}>
                  Screenshots: {ocrQueueStatus.total} total
                </Text>
                <Text variant="body" style={styles.ocrStatus}>
                  OCR Queue: {ocrQueueStatus.pending} pending, {ocrQueueStatus.done} done, {ocrQueueStatus.error} errors
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
              <Text variant="h3" style={styles.progressTitle}>
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
    paddingBottom: 32, // Extra padding at bottom for better scrolling
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
  buttonSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.7,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  button: {
    marginHorizontal: 4,
    marginVertical: 2,
    minWidth: 80,
  },
  seedButton: {
    backgroundColor: '#4CAF50',
  },
  resetButton: {
    backgroundColor: '#FF9800',
  },
  forceResetButton: {
    backgroundColor: '#F44336',
  },
  testButton: {
    backgroundColor: '#9C27B0',
  },
  fixButton: {
    backgroundColor: '#FF5722',
  },
  cleanupButton: {
    backgroundColor: '#9C27B0',
  },
  debugButton: {
    backgroundColor: '#607D8B',
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
