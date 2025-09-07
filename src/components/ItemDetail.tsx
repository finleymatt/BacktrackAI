import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from './Text';
import { Card } from './Card';
import { useTheme } from '../theme/ThemeContext';
import { Item, Tag } from '../data/models';
import { TagsRepository } from '../data/repositories/tags';
import { TagEditor } from './TagEditor';

interface ItemDetailProps {
  item: Item;
}

export const ItemDetail: React.FC<ItemDetailProps> = ({ item }) => {
  const { theme } = useTheme();
  const [tags, setTags] = useState<Tag[]>([]);
  const [showTagEditor, setShowTagEditor] = useState(false);

  // Load tags for this item
  const loadTags = async () => {
    try {
      const itemTags = await TagsRepository.getTagsForItem(item.id);
      setTags(itemTags);
    } catch (error) {
      console.error('Failed to load tags for item:', error);
    }
  };

  useEffect(() => {
    loadTags();
  }, [item.id]);

  const handleTagsUpdated = () => {
    loadTags();
  };

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

        {/* Tags Section */}
        <View style={styles.tagsContainer}>
          <View style={styles.tagsHeader}>
            <Text variant="caption" style={styles.tagsLabel}>
              Tags:
            </Text>
            <TouchableOpacity 
              onPress={() => setShowTagEditor(true)}
              style={styles.editTagsButton}
            >
              <Text style={styles.editTagsText}>✏️</Text>
            </TouchableOpacity>
          </View>
          {tags.length === 0 ? (
            <Text variant="caption" style={styles.noTagsText}>
              No tags assigned
            </Text>
          ) : (
            <View style={styles.tagsList}>
              {tags.map(tag => (
                <View
                  key={tag.id}
                  style={[
                    styles.tagChip,
                    { backgroundColor: tag.color || theme.colors.primary }
                  ]}
                >
                  <Text style={styles.tagText}>{tag.name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

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

      {/* Tag Editor Modal */}
      <TagEditor
        itemId={item.id}
        visible={showTagEditor}
        onClose={() => setShowTagEditor(false)}
        onTagsUpdated={handleTagsUpdated}
      />
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
  tagsContainer: {
    marginBottom: 8,
  },
  tagsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tagsLabel: {
    fontWeight: '500',
    opacity: 0.7,
  },
  editTagsButton: {
    padding: 4,
  },
  editTagsText: {
    fontSize: 12,
  },
  noTagsText: {
    fontStyle: 'italic',
    opacity: 0.6,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'white',
  },
});
