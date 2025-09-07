import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Button, ItemDetail, AddItemsToFolderModal } from '../components';
import { useTheme } from '../theme/ThemeContext';
import { useFolder, useFolderItems } from '../features/folders';
import { Folder } from '../data/models';

interface FolderDetailScreenProps {
  route: {
    params: {
      folderId: string;
    };
  };
  navigation: any;
}

export const FolderDetailScreen: React.FC<FolderDetailScreenProps> = ({ route, navigation }) => {
  const { folderId } = route.params;
  const { theme } = useTheme();
  const { folder, loading: folderLoading, error: folderError, togglePrivacy } = useFolder(folderId);
  const { items, loading: itemsLoading, error: itemsError, loadItems, removeItem } = useFolderItems(folderId);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddItemsModal, setShowAddItemsModal] = useState(false);

  const handleTogglePrivacy = async () => {
    if (!folder) return;
    
    try {
      await togglePrivacy(!folder.is_public);
    } catch (error) {
      Alert.alert('Error', 'Failed to update folder privacy');
    }
  };

  const handleRemoveItem = (itemId: string, itemTitle: string) => {
    Alert.alert(
      'Remove Item',
      `Remove "${itemTitle}" from this folder?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeItem(itemId);
            } catch (error) {
              Alert.alert('Error', 'Failed to remove item from folder');
            }
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadItems()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleItemsAdded = () => {
    loadItems(); // Reload folder items
  };

  const renderItem = ({ item }: { item: any }) => (
    <Card style={styles.itemCard}>
      <ItemDetail item={item} />
      <View style={styles.itemActions}>
        <Button
          title="Remove"
          variant="outline"
          size="small"
          onPress={() => handleRemoveItem(item.id, item.title)}
        />
      </View>
    </Card>
  );

  const renderEmptyState = () => (
    <Card style={styles.emptyCard}>
      <Text variant="h3" style={styles.emptyTitle}>
        No Items Yet
      </Text>
      <Text variant="body" color={theme.colors.textSecondary} style={styles.emptyDescription}>
        Add items to this folder to organize your content.
      </Text>
    </Card>
  );

  if (folderLoading || folderError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.errorContainer}>
          <Text variant="h3" color={theme.colors.error}>
            {folderError || 'Loading folder...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!folder) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.errorContainer}>
          <Text variant="h3" color={theme.colors.error}>
            Folder not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Button
          title="← Back"
          variant="outline"
          size="small"
          onPress={() => navigation.goBack()}
        />
        <Text variant="h2" style={styles.title}>
          {folder.name}
        </Text>
        <Button
          title={folder.is_public ? '🌐' : '🔒'}
          variant="outline"
          size="small"
          onPress={handleTogglePrivacy}
        />
      </View>

      {folder.description && (
        <View style={styles.descriptionContainer}>
          <Text variant="body" color={theme.colors.textSecondary}>
            {folder.description}
          </Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.statsContainer}>
          <Text variant="caption" color={theme.colors.textSecondary}>
            {items.length} {items.length === 1 ? 'item' : 'items'} • {folder.is_public ? 'Public' : 'Private'}
          </Text>
          <Button
            title="Add Items"
            variant="outline"
            size="small"
            onPress={() => setShowAddItemsModal(true)}
          />
        </View>

        {items.length === 0 && !itemsLoading ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {folder && (
        <AddItemsToFolderModal
          visible={showAddItemsModal}
          onClose={() => setShowAddItemsModal(false)}
          folderId={folder.id}
          folderName={folder.name}
          onItemsAdded={handleItemsAdded}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    flex: 1,
    marginHorizontal: 12,
  },
  descriptionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listContainer: {
    paddingBottom: 16,
  },
  itemCard: {
    marginBottom: 12,
  },
  itemActions: {
    marginTop: 12,
    alignItems: 'flex-end',
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
});
