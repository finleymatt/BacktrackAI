import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { useTheme } from '../theme/ThemeContext';
import { TagsRepository } from '../data/repositories/tags';
import { Tag } from '../data/models';

interface TagEditorProps {
  itemId: string;
  visible: boolean;
  onClose: () => void;
  onTagsUpdated?: () => void;
}

export const TagEditor: React.FC<TagEditorProps> = ({
  itemId,
  visible,
  onClose,
  onTagsUpdated,
}) => {
  const { theme } = useTheme();
  const [currentTags, setCurrentTags] = useState<Tag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load current tags for the item
  const loadCurrentTags = async () => {
    try {
      const tags = await TagsRepository.getTagsForItem(itemId);
      setCurrentTags(tags);
    } catch (error) {
      console.error('Failed to load current tags:', error);
    }
  };

  // Load all available tags
  const loadAllTags = async () => {
    try {
      const tags = await TagsRepository.getAll();
      setAllTags(tags);
    } catch (error) {
      console.error('Failed to load all tags:', error);
    }
  };

  // Add tag to item
  const addTagToItem = async (tag: Tag) => {
    try {
      const success = await TagsRepository.addTagToItem(itemId, tag.id);
      if (success) {
        setCurrentTags(prev => [...prev, tag]);
        onTagsUpdated?.();
      }
    } catch (error) {
      console.error('Failed to add tag to item:', error);
      Alert.alert('Error', 'Failed to add tag to item');
    }
  };

  // Remove tag from item
  const removeTagFromItem = async (tag: Tag) => {
    try {
      const success = await TagsRepository.removeTagFromItem(itemId, tag.id);
      if (success) {
        setCurrentTags(prev => prev.filter(t => t.id !== tag.id));
        onTagsUpdated?.();
      }
    } catch (error) {
      console.error('Failed to remove tag from item:', error);
      Alert.alert('Error', 'Failed to remove tag from item');
    }
  };

  // Create new tag
  const createNewTag = async () => {
    if (!newTagName.trim()) {
      Alert.alert('Error', 'Please enter a tag name');
      return;
    }

    setIsLoading(true);
    try {
      const tag = await TagsRepository.getOrCreate(newTagName.trim());
      await addTagToItem(tag);
      setNewTagName('');
      
      // Refresh all tags list
      await loadAllTags();
    } catch (error) {
      console.error('Failed to create new tag:', error);
      Alert.alert('Error', 'Failed to create new tag');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data when modal opens
  useEffect(() => {
    if (visible) {
      loadCurrentTags();
      loadAllTags();
    }
  }, [visible, itemId]);

  const availableTags = allTags.filter(tag => 
    !currentTags.some(currentTag => currentTag.id === tag.id)
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <Text variant="h3" style={styles.title}>Edit Tags</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Current Tags */}
          <View style={styles.section}>
            <Text variant="h4" style={styles.sectionTitle}>Current Tags</Text>
            {currentTags.length === 0 ? (
              <Text variant="bodySmall" style={styles.emptyText}>
                No tags assigned to this item
              </Text>
            ) : (
              <View style={styles.tagList}>
                {currentTags.map(tag => (
                  <TouchableOpacity
                    key={tag.id}
                    style={[
                      styles.tagChip,
                      styles.currentTagChip,
                      { backgroundColor: tag.color || theme.colors.primary }
                    ]}
                    onPress={() => removeTagFromItem(tag)}
                  >
                    <Text style={styles.tagText}>{tag.name}</Text>
                    <Text style={styles.removeIcon}>✕</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Add New Tag */}
          <View style={styles.section}>
            <Text variant="h4" style={styles.sectionTitle}>Add New Tag</Text>
            <View style={styles.addTagContainer}>
              <TextInput
                style={[
                  styles.textInput,
                  { 
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.text,
                    borderColor: theme.colors.border
                  }
                ]}
                placeholder="Enter tag name..."
                placeholderTextColor={theme.colors.textSecondary}
                value={newTagName}
                onChangeText={setNewTagName}
                onSubmitEditing={createNewTag}
                returnKeyType="done"
              />
              <Button
                onPress={createNewTag}
                disabled={!newTagName.trim() || isLoading}
                style={styles.addButton}
              >
                Add
              </Button>
            </View>
          </View>

          {/* Available Tags */}
          {availableTags.length > 0 && (
            <View style={styles.section}>
              <Text variant="h4" style={styles.sectionTitle}>Available Tags</Text>
              <View style={styles.tagList}>
                {availableTags.map(tag => (
                  <TouchableOpacity
                    key={tag.id}
                    style={[
                      styles.tagChip,
                      styles.availableTagChip,
                      { 
                        backgroundColor: theme.colors.surface,
                        borderColor: tag.color || theme.colors.primary
                      }
                    ]}
                    onPress={() => addTagToItem(tag)}
                  >
                    <Text style={[styles.tagText, { color: tag.color || theme.colors.primary }]}>
                      {tag.name}
                    </Text>
                    <Text style={styles.addIcon}>+</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  emptyText: {
    fontStyle: 'italic',
    opacity: 0.6,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  currentTagChip: {
    // Styled with backgroundColor from props
  },
  availableTagChip: {
    borderWidth: 1,
    // Styled with borderColor from props
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
    marginRight: 6,
  },
  removeIcon: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  addIcon: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  addTagContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
