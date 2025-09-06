import React, { useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Button } from '../components';
import { useTheme } from '../theme/ThemeContext';
import { scanAndIngestScreenshots, ScreenshotDetectionResult, clearAllScreenshots } from '../features/ingest/photosScan';

export const AddScreen: React.FC = () => {
  const { theme } = useTheme();
  const [isScanning, setIsScanning] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleScanScreenshots = async () => {
    try {
      setIsScanning(true);
      const result: ScreenshotDetectionResult = await scanAndIngestScreenshots();
      
      if (result.success) {
        if (result.itemsCreated > 0) {
          Alert.alert(
            'Screenshots Found!',
            `Successfully found and saved ${result.itemsCreated} screenshots to your collection.`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'No Screenshots Found',
            'No new screenshots were detected in your recent photos. Try taking some screenshots and try again!',
            [{ text: 'OK' }]
          );
        }
      } else {
        const errorMessage = result.errors.length > 0 
          ? result.errors.join('\n')
          : 'An unknown error occurred while scanning for screenshots.';
        
        Alert.alert(
          'Scan Failed',
          errorMessage,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Failed to scan screenshots:', error);
      Alert.alert(
        'Error',
        'Failed to scan for screenshots. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleClearScreenshots = async () => {
    Alert.alert(
      'Clear All Screenshots',
      'This will remove all screenshot items from your collection. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsClearing(true);
              const deletedCount = await clearAllScreenshots();
              Alert.alert(
                'Screenshots Cleared',
                `Successfully removed ${deletedCount} screenshot items from your collection.`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Failed to clear screenshots:', error);
              Alert.alert(
                'Error',
                'Failed to clear screenshots. Please try again.',
                [{ text: 'OK' }]
              );
            } finally {
              setIsClearing(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text variant="h1" style={styles.title}>
          Add Content
        </Text>
        
        <Card style={styles.card}>
          <Text variant="body" style={styles.description}>
            Add new content to your collection. Import photos, videos, or create new memories to organize and preserve.
          </Text>
          
          <View style={styles.buttonContainer}>
            <Button
              title={isScanning ? "Scanning..." : "Scan Screenshots"}
              onPress={handleScanScreenshots}
              disabled={isScanning || isClearing}
              style={styles.scanButton}
            />
            
            <Button
              title={isClearing ? "Clearing..." : "Clear All Screenshots"}
              onPress={handleClearScreenshots}
              disabled={isScanning || isClearing}
              variant="outline"
              style={styles.clearButton}
            />
            
            {(isScanning || isClearing) && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text variant="caption" style={styles.loadingText}>
                  {isScanning ? "Scanning your photos for screenshots..." : "Clearing screenshots..."}
                </Text>
              </View>
            )}
          </View>
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
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  scanButton: {
    marginBottom: 12,
    minWidth: 200,
  },
  clearButton: {
    marginBottom: 16,
    minWidth: 200,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 8,
  },
});
