import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Button, ItemDetail, AddToFolderModal } from './';
import { useTheme } from '../theme/ThemeContext';
import { Item } from '../data/models';

interface ItemCardProps {
  item: Item;
  onPress?: () => void;
  showAddToFolder?: boolean;
  onItemAddedToFolder?: () => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  onPress,
  showAddToFolder = true,
  onItemAddedToFolder,
}) => {
  const { theme } = useTheme();
  const [showAddToFolderModal, setShowAddToFolderModal] = useState(false);

  const handleAddToFolder = () => {
    setShowAddToFolderModal(true);
  };

  const handleItemAdded = () => {
    onItemAddedToFolder?.();
    setShowAddToFolderModal(false);
  };

  return (
    <>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
          <ItemDetail item={item} />
          
        {showAddToFolder && (
          <View style={styles.actions}>
            <TouchableOpacity onPress={handleAddToFolder} style={styles.folderButton}>
              <Text style={styles.folderIcon}>📁</Text>
            </TouchableOpacity>
          </View>
        )}
        </View>
      </TouchableOpacity>

      <AddToFolderModal
        visible={showAddToFolderModal}
        onClose={() => setShowAddToFolderModal(false)}
        itemId={item.id}
        itemTitle={item.title}
        onItemAdded={handleItemAdded}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    marginBottom: 12,
    overflow: 'hidden',
  },
  actions: {
    padding: 16,
    paddingTop: 0,
    alignItems: 'flex-end',
  },
  folderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderIcon: {
    fontSize: 20,
  },
});
