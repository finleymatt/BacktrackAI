import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, Alert, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Card, ItemDetail } from './';
import { useTheme } from '../theme/ThemeContext';
import { useItemsNotInFolder } from '../features/items';
import { Item } from '../data/models';

interface AddItemsToFolderModalProps {
  visible: boolean;
  onClose: () => void;
  folderId: string;
  folderName: string;
  onItemsAdded?: () => void;
}

export const AddItemsToFolderModal: React.FC<AddItemsToFolderModalProps> = ({
  visible,
  onClose,
  folderId,
  folderName,
  onItemsAdded,
}) => {
  const { theme } = useTheme();
  const { items, loading, error, loadItems } = useItemsNotInFolder(folderId);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (visible) {
      loadItems();
      setSelectedItems(new Set());
    }
  }, [visible, loadItems]);

  const handleToggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleAddSelectedItems = async () => {
    if (selectedItems.size === 0) {
      Alert.alert('No Items Selected', 'Please select items to add to the folder.');
      return;
    }

    try {
      setAdding(true);
      // Import the folder service here to avoid circular dependency
      const { FolderService } = await import('../features/folders/folderService');
      
      let successCount = 0;
      for (const itemId of selectedItems) {
        try {
          const success = await FolderService.addItemToFolder(itemId, folderId);
          if (success) successCount++;
        } catch (error) {
          console.error(`Failed to add item ${itemId} to folder:`, error);
        }
      }

      if (successCount > 0) {
        Alert.alert(
          'Success', 
          `${successCount} item${successCount === 1 ? '' : 's'} added to "${folderName}"`
        );
        onItemsAdded?.();
        onClose();
      } else {
        Alert.alert('Error', 'Failed to add items to folder');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add items to folder');
    } finally {
      setAdding(false);
    }
  };

  const renderItem = ({ item }: { item: Item }) => {
    const isSelected = selectedItems.has(item.id);
    
    return (
      <TouchableOpacity
        onPress={() => handleToggleItem(item.id)}
        style={[
          styles.itemCard,
          isSelected && { backgroundColor: theme.colors.primary + '20' }
        ]}
      >
        <View style={styles.itemContent}>
          <ItemDetail item={item} />
        </View>
        <View style={[
          styles.checkbox,
          { borderColor: theme.colors.border },
          isSelected && { backgroundColor: theme.colors.primary }
        ]}>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <Card style={styles.emptyCard}>
      <Text variant="h4" style={styles.emptyTitle}>
        No Available Items
      </Text>
      <Text variant="body" color={theme.colors.textSecondary} style={styles.emptyDescription}>
        All items are already in this folder or no items exist yet.
      </Text>
    </Card>
  );

  if (error) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <View style={styles.header}>
            <Text variant="h2">Add Items</Text>
            <Button
              title="Close"
              variant="outline"
              size="small"
              onPress={onClose}
            />
          </View>
          <View style={styles.errorContainer}>
            <Text variant="h4" color={theme.colors.error}>
              Error Loading Items
            </Text>
            <Text variant="body" color={theme.colors.textSecondary} style={styles.errorText}>
              {error}
            </Text>
            <Button
              title="Retry"
              onPress={loadItems}
              style={styles.retryButton}
            />
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <Text variant="h2">Add Items</Text>
          <Button
            title="Cancel"
            variant="outline"
            size="small"
            onPress={onClose}
          />
        </View>

        <View style={styles.content}>
          <Text variant="body" color={theme.colors.textSecondary} style={styles.subtitle}>
            Add items to "{folderName}":
          </Text>

          {items.length === 0 && !loading ? (
            renderEmptyState()
          ) : (
            <FlatList
              data={items}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              refreshing={loading}
              onRefresh={loadItems}
            />
          )}

          {selectedItems.size > 0 && (
            <View style={styles.footer}>
              <Text variant="body" color={theme.colors.textSecondary} style={styles.selectionText}>
                {selectedItems.size} item{selectedItems.size === 1 ? '' : 's'} selected
              </Text>
              <Button
                title={`Add ${selectedItems.size} Item${selectedItems.size === 1 ? '' : 's'}`}
                onPress={handleAddSelectedItems}
                loading={adding}
                disabled={adding}
                style={styles.addButton}
              />
            </View>
          )}
        </View>
      </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  subtitle: {
    marginBottom: 16,
  },
  listContainer: {
    paddingBottom: 16,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  itemContent: {
    flex: 1,
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  selectionText: {
    flex: 1,
  },
  addButton: {
    minWidth: 120,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    textAlign: 'center',
    marginVertical: 16,
    lineHeight: 20,
  },
  retryButton: {
    minWidth: 120,
  },
});
