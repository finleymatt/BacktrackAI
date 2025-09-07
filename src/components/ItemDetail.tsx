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

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={styles.card}>
        <Text variant="h2" style={styles.title}>
          {item.title}
        </Text>
        
        {item.description && (
          <Text variant="body" style={styles.description}>
            {item.description}
          </Text>
        )}

        {item.content_url && (
          <View style={styles.urlContainer}>
            <Text variant="bodySmall" style={styles.urlLabel}>
              Link:
            </Text>
            <Text variant="bodySmall" style={[styles.urlText, { color: theme.colors.primary }]}>
              {item.content_url}
            </Text>
          </View>
        )}

        <View style={styles.metaContainer}>
          <Text variant="caption" style={styles.metaText}>
            Source: {item.source}
          </Text>
          {item.platform && (
            <Text variant="caption" style={styles.metaText}>
              Platform: {item.platform}
            </Text>
          )}
          <Text variant="caption" style={styles.metaText}>
            Created: {new Date(item.created_at).toLocaleDateString()}
          </Text>
          <Text variant="caption" style={styles.metaText}>
            OCR Status: {item.ocr_done ? '✅ Completed' : '⏳ Pending'}
          </Text>
        </View>
      </Card>

      {item.ocr_text && (
        <Card style={styles.card}>
          <Text variant="h3" style={styles.sectionTitle}>
            Extracted Text
          </Text>
          <Text variant="body" style={styles.ocrText}>
            {item.ocr_text}
          </Text>
        </Card>
      )}

      {item.content_url && (
        <Card style={styles.card}>
          <Text variant="h3" style={styles.sectionTitle}>
            Content
          </Text>
          <Text variant="caption" style={styles.urlText}>
            {item.content_url}
          </Text>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    margin: 16,
    marginBottom: 8,
  },
  title: {
    marginBottom: 8,
  },
  description: {
    marginBottom: 12,
    opacity: 0.8,
  },
  urlContainer: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 6,
  },
  urlLabel: {
    marginBottom: 4,
    fontWeight: '500',
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaText: {
    opacity: 0.6,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  ocrText: {
    lineHeight: 20,
    fontFamily: 'monospace',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 12,
    borderRadius: 8,
  },
  urlText: {
    fontFamily: 'monospace',
    opacity: 0.7,
  },
});
