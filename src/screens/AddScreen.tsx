import React, { useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Button, TextInput } from '../components';
import { useTheme } from '../theme/ThemeContext';
import { scanScreenshots, clearAllScreenshots } from '../features/ingest/photosScan';
import { ingestUrl, isValidUrl, getPlatformDisplayName } from '../features/ingest/urlIngest';

export const AddScreen: React.FC = () => {
  const { theme } = useTheme();
  const [isScanning, setIsScanning] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isSavingUrl, setIsSavingUrl] = useState(false);
  const [urlError, setUrlError] = useState('');

  const handleScanScreenshots = async () => {
    try {
      setIsScanning(true);
      const insertedItemIds = await scanScreenshots(50);
      
      if (insertedItemIds.length > 0) {
        Alert.alert(
          'Screenshots Imported!',
          `Successfully imported ${insertedItemIds.length} screenshots (OCR pending). Use the "Process Screenshot OCR" button on the Home screen to extract text from them.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'No New Screenshots Found',
          'No new screenshots were detected in your recent photos. Try taking some screenshots and try again!',
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

  const handleSaveUrl = async () => {
    // Clear previous errors
    setUrlError('');
    
    // Validate URL
    if (!urlInput.trim()) {
      setUrlError('Please enter a URL');
      return;
    }
    
    if (!isValidUrl(urlInput.trim())) {
      setUrlError('Please enter a valid URL');
      return;
    }
    
    try {
      setIsSavingUrl(true);
      const result = await ingestUrl(urlInput.trim());
      
      if (result.success) {
        Alert.alert(
          'URL Saved!',
          `Successfully saved ${getPlatformDisplayName(result.item.platform)} link to your collection.`,
          [{ text: 'OK' }]
        );
        setUrlInput(''); // Clear the input
      } else {
        Alert.alert(
          'Save Failed',
          result.error || 'Failed to save URL. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Failed to save URL:', error);
      Alert.alert(
        'Error',
        'Failed to save URL. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSavingUrl(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text variant="h1" style={styles.title}>
          Add Content
        </Text>
        
        {/* URL Input Section */}
        <Card style={styles.card}>
          <Text variant="h3" style={styles.sectionTitle}>
            Add by URL
          </Text>
          <Text variant="body" style={styles.sectionDescription}>
            Paste a URL from YouTube, Spotify, Instagram, or any website to save it to your collection.
          </Text>
          
          <TextInput
            label="URL"
            placeholder="https://www.youtube.com/watch?v=..."
            value={urlInput}
            onChangeText={setUrlInput}
            error={urlError}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="done"
            onSubmitEditing={handleSaveUrl}
            style={styles.urlInput}
          />
          
          <Button
            title={isSavingUrl ? "Saving..." : "Save URL"}
            onPress={handleSaveUrl}
            disabled={isSavingUrl || !urlInput.trim()}
            style={styles.saveUrlButton}
          />
          
          {isSavingUrl && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text variant="caption" style={styles.loadingText}>
                Fetching metadata and saving URL...
              </Text>
            </View>
          )}
        </Card>
        
        {/* Screenshot Section */}
        <Card style={styles.card}>
          <Text variant="h3" style={styles.sectionTitle}>
            Import Screenshots
          </Text>
          <Text variant="body" style={styles.sectionDescription}>
            Scan your photos for screenshots and automatically add them to your collection.
          </Text>
          
          <View style={styles.buttonContainer}>
            <Button
              title={isScanning ? "Scanning..." : "Scan Screenshots"}
              onPress={handleScanScreenshots}
              disabled={isScanning || isClearing || isSavingUrl}
              style={styles.scanButton}
            />
            
            <Button
              title={isClearing ? "Clearing..." : "Clear All Screenshots"}
              onPress={handleClearScreenshots}
              disabled={isScanning || isClearing || isSavingUrl}
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
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionDescription: {
    textAlign: 'center',
    marginBottom: 20,
  },
  urlInput: {
    marginBottom: 16,
  },
  saveUrlButton: {
    marginBottom: 16,
    minWidth: 200,
    alignSelf: 'center',
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
    marginTop: 8,
  },
  loadingText: {
    marginLeft: 8,
  },
});
