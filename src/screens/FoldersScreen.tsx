import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Button, FolderCard, CreateFolderModal } from '../components';
import { useTheme } from '../theme/ThemeContext';
import { useFolders } from '../features/folders';
import { Folder } from '../data/models';
import { fixFoldersTable } from '../features/folders/folderDebug';

interface FoldersScreenProps {
  navigation: any;
}

export const FoldersScreen: React.FC<FoldersScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { folders, loading, error, createFolder, togglePrivacy, deleteFolder, loadFolders } = useFolders();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleCreateFolder = async (data: { name: string; description?: string; color?: string; is_public?: boolean }) => {
    try {
      await createFolder(data);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleTogglePrivacy = async (folder: Folder) => {
    try {
      await togglePrivacy(folder.id, !folder.is_public);
    } catch (error) {
      Alert.alert('Error', 'Failed to update folder privacy');
    }
  };

  const handleDeleteFolder = (folder: Folder) => {
    Alert.alert(
      'Delete Folder',
      `Are you sure you want to delete "${folder.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFolder(folder.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete folder');
            }
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadFolders();
    } finally {
      setRefreshing(false);
    }
  };

  const handleFixDatabase = async () => {
    try {
      const success = await fixFoldersTable();
      if (success) {
        Alert.alert('Success', 'Database fixed! Please restart the app.');
      } else {
        Alert.alert('Error', 'Failed to fix database');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fix database');
    }
  };

  const renderFolder = ({ item }: { item: Folder }) => (
    <FolderCard
      folder={item}
      onPress={() => {
        navigation.navigate('FolderDetail', { folderId: item.id });
      }}
      onTogglePrivacy={() => handleTogglePrivacy(item)}
    />
  );

  const renderEmptyState = () => (
    <Card style={styles.emptyCard}>
      <Text variant="h3" style={styles.emptyTitle}>
        No Folders Yet
      </Text>
      <Text variant="body" color={theme.colors.textSecondary} style={styles.emptyDescription}>
        Create your first folder to organize your content into collections.
      </Text>
      <Button
        title="Create Folder"
        onPress={() => setShowCreateModal(true)}
        style={styles.emptyButton}
      />
    </Card>
  );

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.errorContainer}>
          <Text variant="h3" color={theme.colors.error}>
            Error Loading Folders
          </Text>
          <Text variant="body" color={theme.colors.textSecondary} style={styles.errorText}>
            {error}
          </Text>
          <View style={styles.errorButtons}>
            <Button
              title="Retry"
              onPress={loadFolders}
              style={styles.retryButton}
            />
            <Button
              title="Fix Database"
              variant="outline"
              onPress={handleFixDatabase}
              style={styles.fixButton}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="h1" style={styles.title}>
          Folders
        </Text>
        <Button
          title="New"
          variant="outline"
          size="small"
          onPress={() => setShowCreateModal(true)}
        />
      </View>

      <View style={styles.content}>
        {folders.length === 0 && !loading ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={folders}
            renderItem={renderFolder}
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

      <CreateFolderModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateFolder={handleCreateFolder}
      />
    </SafeAreaView>
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
  title: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  listContainer: {
    paddingBottom: 16,
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
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    minWidth: 140,
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
  errorButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    minWidth: 120,
  },
  fixButton: {
    minWidth: 120,
  },
});

