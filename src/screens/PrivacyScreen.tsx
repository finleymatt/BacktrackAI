import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Button } from '../components';
import { useTheme } from '../theme/ThemeContext';
import { getDatabase } from '../data/db';
import { ItemsRepository, FoldersRepository, TagsRepository } from '../data/repositories';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export const PrivacyScreen: React.FC = () => {
  const { theme } = useTheme();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const db = await getDatabase();
      const [items, folders, tags] = await Promise.all([
        ItemsRepository.getAll(),
        FoldersRepository.getAll(),
        TagsRepository.getAll()
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        data: {
          items,
          folders,
          tags
        },
        metadata: {
          totalItems: items.length,
          totalFolders: folders.length,
          totalTags: tags.length
        }
      };

      const fileName = `backtrack-export-${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(exportData, null, 2));
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Backtrack Data'
        });
      } else {
        Alert.alert(
          'Export Complete',
          `Data exported to: ${fileName}\n\nFile saved to your device's document directory.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert(
        'Export Failed',
        'Failed to export your data. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAllData = () => {
    Alert.alert(
      'Delete All Data',
      'This will permanently delete all your items, folders, and tags. This action cannot be undone.\n\nAre you sure you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All Data',
          style: 'destructive',
          onPress: confirmDeleteAllData
        }
      ]
    );
  };

  const confirmDeleteAllData = async () => {
    setIsDeleting(true);
    try {
      const db = await getDatabase();
      
      // Delete all data in the correct order (respecting foreign key constraints)
      await db.transactionAsync(async (tx) => {
        await tx.executeSqlAsync('DELETE FROM items_tags');
        await tx.executeSqlAsync('DELETE FROM items');
        await tx.executeSqlAsync('DELETE FROM folders');
        await tx.executeSqlAsync('DELETE FROM tags');
      });

      Alert.alert(
        'Data Deleted',
        'All your data has been permanently deleted.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Delete failed:', error);
      Alert.alert(
        'Delete Failed',
        'Failed to delete your data. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeviceSettings = () => {
    Linking.openSettings();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text variant="h1" style={styles.title}>
            Privacy & Data
          </Text>
          
          <Card style={styles.card}>
            <Text variant="body" style={styles.description}>
              We believe in transparency about your data. This screen explains what we collect, why we need it, and how you can control it.
            </Text>
          </Card>

          {/* Data Collection Section */}
          <Card style={styles.card}>
            <Text variant="h3" style={styles.sectionTitle}>
              What Data We Collect
            </Text>
            
            <Text variant="body" style={styles.bulletPoint}>
              • <Text variant="body" style={styles.bold}>Screenshots:</Text> Images you capture through the app for memory storage
            </Text>
            
            <Text variant="body" style={styles.bulletPoint}>
              • <Text variant="body" style={styles.bold}>URLs:</Text> Web links you save for future reference
            </Text>
            
            <Text variant="body" style={styles.bulletPoint}>
              • <Text variant="body" style={styles.bold}>Metadata:</Text> Timestamps, tags, and folder organization you create
            </Text>
            
            <Text variant="body" style={styles.bulletPoint}>
              • <Text variant="body" style={styles.bold}>Usage Data:</Text> App performance metrics and crash reports (anonymized)
            </Text>

            <Text variant="caption" style={styles.note}>
              All data is stored locally on your device by default. Cloud sync is optional and requires your explicit consent.
            </Text>
          </Card>

          {/* Permissions Section */}
          <Card style={styles.card}>
            <Text variant="h3" style={styles.sectionTitle}>
              App Permissions
            </Text>
            
            <Text variant="body" style={styles.bulletPoint}>
              • <Text variant="body" style={styles.bold}>Photos Access:</Text> To save screenshots and import existing photos
            </Text>
            
            <Text variant="body" style={styles.bulletPoint}>
              • <Text variant="body" style={styles.bold}>Notifications:</Text> To send you memory reminders and app updates
            </Text>
            
            <Text variant="body" style={styles.bulletPoint}>
              • <Text variant="body" style={styles.bold}>Camera:</Text> To capture new screenshots directly in the app
            </Text>

            <Button
              title="Open Device Settings"
              onPress={openDeviceSettings}
              variant="outline"
              size="small"
              style={styles.settingsButton}
            />

            <Text variant="caption" style={styles.note}>
              You can revoke these permissions at any time through your device settings. The app will continue to work with limited functionality.
            </Text>
          </Card>

          {/* Integrations Section */}
          <Card style={styles.card}>
            <Text variant="h3" style={styles.sectionTitle}>
              Current Integrations
            </Text>
            
            <Text variant="body" style={styles.bulletPoint}>
              • <Text variant="body" style={styles.bold}>Instagram:</Text> Preview and save Instagram posts
            </Text>
            
            <Text variant="body" style={styles.bulletPoint}>
              • <Text variant="body" style={styles.bold}>YouTube:</Text> Preview and save YouTube videos
            </Text>
            
            <Text variant="body" style={styles.bulletPoint}>
              • <Text variant="body" style={styles.bold}>General URLs:</Text> Preview and save any web content
            </Text>

            <Text variant="h3" style={styles.subsectionTitle}>
              Planned Integrations
            </Text>
            
            <Text variant="body" style={styles.bulletPoint}>
              • <Text variant="body" style={styles.bold}>Spotify:</Text> Save music tracks and playlists
            </Text>
            
            <Text variant="body" style={styles.bulletPoint}>
              • <Text variant="body" style={styles.bold}>Facebook:</Text> Save Facebook posts and content
            </Text>
            
            <Text variant="body" style={styles.bulletPoint}>
              • <Text variant="body" style={styles.bold}>Microsoft Edge:</Text> Browser integration for seamless saving
            </Text>

            <Text variant="caption" style={styles.note}>
              These integrations will only access public content and will not require your social media login credentials.
            </Text>
          </Card>

          {/* Data Control Section */}
          <Card style={styles.card}>
            <Text variant="h3" style={styles.sectionTitle}>
              Your Data Controls
            </Text>
            
            <Text variant="body" style={styles.controlDescription}>
              You have complete control over your data. Here's what you can do:
            </Text>

            <Button
              title={isExporting ? 'Exporting...' : 'Export All Data'}
              onPress={handleExportData}
              disabled={isExporting}
              variant="outline"
              style={styles.controlButton}
            />

            <Text variant="caption" style={styles.controlNote}>
              Export your data as a JSON file that you can save elsewhere or import into other apps.
            </Text>

            <Button
              title={isDeleting ? 'Deleting...' : 'Delete All Data'}
              onPress={handleDeleteAllData}
              disabled={isDeleting}
              variant="outline"
              style={[styles.controlButton, styles.deleteButton]}
            />

            <Text variant="caption" style={styles.controlNote}>
              Permanently delete all your items, folders, and tags. This action cannot be undone.
            </Text>
          </Card>

          {/* Privacy Policy Section */}
          <Card style={styles.card}>
            <Text variant="h3" style={styles.sectionTitle}>
              Privacy Policy
            </Text>
            
            <Text variant="body" style={styles.policyText}>
              We are committed to protecting your privacy. Your data belongs to you, and we will never sell or share your personal information with third parties without your explicit consent.
            </Text>
            
            <Text variant="body" style={styles.policyText}>
              When you use cloud sync, your data is encrypted and stored securely. You can disable cloud sync at any time, and your data will remain only on your device.
            </Text>
            
            <Text variant="body" style={styles.policyText}>
              We may collect anonymous usage statistics to improve the app, but this data cannot be linked back to you personally.
            </Text>
          </Card>

          {/* Contact Section */}
          <Card style={styles.card}>
            <Text variant="h3" style={styles.sectionTitle}>
              Questions or Concerns?
            </Text>
            
            <Text variant="body" style={styles.contactText}>
              If you have any questions about your privacy or data, please contact us through the app's support channels.
            </Text>
            
            <Text variant="body" style={styles.contactText}>
              We regularly review and update our privacy practices to ensure they meet the highest standards.
            </Text>
          </Card>
        </View>
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
  subsectionTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  bulletPoint: {
    marginBottom: 8,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
  },
  note: {
    marginTop: 12,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  settingsButton: {
    marginTop: 12,
    marginBottom: 8,
  },
  controlDescription: {
    marginBottom: 16,
  },
  controlButton: {
    marginBottom: 8,
  },
  deleteButton: {
    borderColor: '#FF3B30',
  },
  controlNote: {
    marginBottom: 16,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  policyText: {
    marginBottom: 12,
    lineHeight: 20,
  },
  contactText: {
    marginBottom: 8,
    lineHeight: 20,
  },
});
