import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Linking, Alert } from 'react-native';
import { Text, AddToFolderModal } from './';
import { Card } from './Card';
import { useTheme } from '../theme/ThemeContext';
import { Item } from '../data/models';

interface YouTubePreviewProps {
  item: Item;
  onPress?: () => void;
}

export const YouTubePreview: React.FC<YouTubePreviewProps> = ({ item, onPress }) => {
  const { theme } = useTheme();
  const [showAddToFolderModal, setShowAddToFolderModal] = useState(false);

  const handleOpenYouTube = async () => {
    if (!item.content_url) return;

    try {
      // Try to open YouTube app first
      const youtubeUrl = item.content_url.replace('www.youtube.com', 'youtube.com');
      const canOpen = await Linking.canOpenURL(youtubeUrl);
      
      if (canOpen) {
        await Linking.openURL(youtubeUrl);
      } else {
        // Fallback to web browser
        await Linking.openURL(item.content_url);
      }
    } catch (error) {
      console.error('Error opening YouTube:', error);
      Alert.alert(
        'Error',
        'Could not open YouTube. Please check if the app is installed.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleCardPress = () => {
    if (onPress) {
      onPress();
    } else {
      handleOpenYouTube();
    }
  };

  return (
    <>
      <TouchableOpacity onPress={handleCardPress} activeOpacity={0.7}>
        <Card style={[styles.container, { backgroundColor: theme.colors.surface }]}>
          {/* YouTube Header */}
          <View style={styles.header}>
            <View style={styles.youtubeIcon}>
              <Text style={styles.youtubeText}>▶️</Text>
            </View>
            <View style={styles.headerText}>
              <Text variant="bodySmall" style={styles.platform}>
                YouTube
              </Text>
              <Text variant="caption" style={styles.timestamp}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity onPress={() => setShowAddToFolderModal(true)} style={styles.iconButton}>
                <Text style={styles.iconText}>📁</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleOpenYouTube} style={styles.iconButton}>
                <Text style={styles.iconText}>🔗</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Content Preview */}
          <View style={styles.content}>
            {item.thumbnail_url ? (
              <Image
                source={{ uri: item.thumbnail_url }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.placeholder, { backgroundColor: theme.colors.border }]}>
                <Text style={styles.placeholderText}>▶️</Text>
              </View>
            )}
            
            <View style={styles.textContent}>
              <Text variant="body" style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
              {item.description && (
                <Text variant="bodySmall" style={styles.description} numberOfLines={3}>
                  {item.description}
                </Text>
              )}
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text variant="caption" style={styles.urlText} numberOfLines={1}>
              {item.content_url}
            </Text>
          </View>
        </Card>
      </TouchableOpacity>

      <AddToFolderModal
        visible={showAddToFolderModal}
        onClose={() => setShowAddToFolderModal(false)}
        itemId={item.id}
        itemTitle={item.title}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 8,
  },
  youtubeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF0000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  youtubeText: {
    fontSize: 16,
  },
  headerText: {
    flex: 1,
  },
  platform: {
    fontWeight: '600',
    marginBottom: 2,
  },
  timestamp: {
    opacity: 0.6,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 16,
  },
  content: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  placeholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  placeholderText: {
    fontSize: 24,
    opacity: 0.5,
  },
  textContent: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontWeight: '500',
    marginBottom: 4,
  },
  description: {
    opacity: 0.8,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    paddingTop: 8,
  },
  urlText: {
    opacity: 0.6,
    fontFamily: 'monospace',
  },
});
