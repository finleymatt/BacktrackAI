import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from './Text';
import { Card } from './Card';
import { useTheme } from '../theme/ThemeContext';
import { Item } from '../data/models';

interface ItemDetailProps {
  item: Item;
}

export const ItemDetail: React.FC<ItemDetailProps> = ({ item }) => {
  const { theme } = useTheme();

  // Don't render if item has no meaningful content
  const hasContent = item.title || item.description || item.ocr_text || item.content_url;
  if (!hasContent) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.card}>
        <Text variant="h3" style={styles.title} numberOfLines={2}>
          {item.title || 'Untitled Item'}
        </Text>
        
        {item.description && (
          <Text variant="bodySmall" style={styles.description} numberOfLines={3}>
            {item.description}
          </Text>
        )}

        {item.ocr_text && (
          <View style={styles.ocrContainer}>
            <Text variant="caption" style={styles.ocrLabel}>
              OCR Text:
            </Text>
            <Text variant="bodySmall" style={styles.ocrText} numberOfLines={2}>
              {item.ocr_text}
            </Text>
          </View>
        )}

        <View style={styles.metaContainer}>
          <Text variant="caption" style={styles.metaText}>
            {item.source}
          </Text>
          {item.platform && (
            <Text variant="caption" style={styles.metaText}>
              • {item.platform}
            </Text>
          )}
          <Text variant="caption" style={styles.metaText}>
            • {new Date(item.created_at).toLocaleDateString()}
          </Text>
          <Text variant="caption" style={styles.metaText}>
            • {item.ocr_done ? '✅' : '⏳'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    padding: 12,
  },
  title: {
    marginBottom: 6,
    fontWeight: '600',
  },
  description: {
    marginBottom: 8,
    opacity: 0.8,
    lineHeight: 16,
  },
  ocrContainer: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 6,
  },
  ocrLabel: {
    marginBottom: 4,
    fontWeight: '500',
    opacity: 0.7,
  },
  ocrText: {
    lineHeight: 16,
    opacity: 0.8,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  metaText: {
    opacity: 0.6,
    fontSize: 11,
  },
});
