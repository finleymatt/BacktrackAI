import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Card, FolderCard } from './';
import { useTheme } from '../theme/ThemeContext';
import { useFolders } from '../features/folders/folderHooks';
import { Folder } from '../data/models';

interface AddToFolderModalProps {
  visible: boolean;
  onClose: () => void;
  itemId: string;
  itemTitle: string;
  onItemAdded?: () => void;
}

export const AddToFolderModal: React.FC<AddToFolderModalProps> = ({
  visible,
  onClose,
  itemId,
  itemTitle,
  onItemAdded,
}) => {
  const { theme } = useTheme();
  const { folders, addItemToFolder } = useFolders();
  const [loading, setLoading] = useState<string | null>(null);

  const handleAddToFolder = async (folderId: string, folderName: string) => {
    try {
      setLoading(folderId);
      await addItemToFolder(itemId, folderId);
      Alert.alert('Success', `"${itemTitle}" added to "${folderName}"`);
      onItemAdded?.();
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to add item to folder');
    } finally {
      setLoading(null);
    }
  };

  const renderFolder = ({ item }: { item: Folder }) => (
    <Card style={styles.folderCard}>
      <View style={styles.folderInfo}>
        <Text variant="h4" style={styles.folderName}>
          {item.name}
        </Text>
        {item.description && (
          <Text variant="caption" color={theme.colors.textSecondary}>
            {item.description}
          </Text>
        )}
        <Text variant="caption" color={theme.colors.textSecondary}>
          {item.is_public ? '🌐 Public' : '🔒 Private'}
        </Text>
      </View>
      <Button
        title="Add"
        size="small"
        onPress={() => handleAddToFolder(item.id, item.name)}
        loading={loading === item.id}
        disabled={loading !== null}
      />
    </Card>
  );

  const renderEmptyState = () => (
    <Card style={styles.emptyCard}>
      <Text variant="h4" style={styles.emptyTitle}>
        No Folders Available
      </Text>
      <Text variant="body" color={theme.colors.textSecondary} style={styles.emptyDescription}>
        Create a folder first to organize your items.
      </Text>
    </Card>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <Text variant="h2">Add to Folder</Text>
          <Button
            title="Cancel"
            variant="outline"
            size="small"
            onPress={onClose}
          />
        </View>

        <View style={styles.content}>
          <Text variant="body" color={theme.colors.textSecondary} style={styles.subtitle}>
            Add "{itemTitle}" to a folder:
          </Text>

          {folders.length === 0 ? (
            renderEmptyState()
          ) : (
            <FlatList
              data={folders}
              renderItem={renderFolder}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
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
  folderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  folderInfo: {
    flex: 1,
    marginRight: 12,
  },
  folderName: {
    marginBottom: 4,
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
});
