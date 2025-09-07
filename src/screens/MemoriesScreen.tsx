import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, ItemDetail, ItemCard, InstagramPreview, YouTubePreview, UrlPreview } from '../components';
import { useTheme } from '../theme/ThemeContext';
import { ItemsRepository } from '../data/repositories/items';
import { Item } from '../data/models';

export const MemoriesScreen: React.FC = () => {
  const { theme } = useTheme();
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      const allItems = await ItemsRepository.getAll(50, 0);
      setItems(allItems);
    } catch (error) {
      console.error('Failed to load items:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Item }) => {
    // Use platform-specific preview for URL items
    if (item.source === 'url' && item.platform) {
      switch (item.platform) {
        case 'instagram':
          return (
            <InstagramPreview 
              item={item} 
              onPress={() => setSelectedItem(item)} 
            />
          );
        case 'youtube':
          return (
            <YouTubePreview 
              item={item} 
              onPress={() => setSelectedItem(item)} 
            />
          );
        default:
          return (
            <UrlPreview 
              item={item} 
              onPress={() => setSelectedItem(item)} 
            />
          );
      }
    }

    // Default card for non-URL items
    return (
      <ItemCard
        item={item}
        onPress={() => setSelectedItem(item)}
        showAddToFolder={true}
      />
    );
  };

  if (selectedItem) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedItem(null)}>
            <Text variant="button" style={styles.backButton}>
              ← Back to Memories
            </Text>
          </TouchableOpacity>
        </View>
        <ItemDetail item={selectedItem} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text variant="h1" style={styles.title}>
          Memories
        </Text>
        
        {loading ? (
          <Card style={styles.card}>
            <Text variant="body" style={styles.description}>
              Loading your memories...
            </Text>
          </Card>
        ) : items.length > 0 ? (
          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            style={styles.itemsList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.itemsListContent}
          />
        ) : (
          <Card style={styles.card}>
            <Text variant="body" style={styles.description}>
              No memories yet. Start by adding some content from the Add tab!
            </Text>
          </Card>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 24,
    textAlign: 'center',
  },
  card: {
    marginBottom: 16,
  },
  description: {
    textAlign: 'center',
  },
  itemsList: {
    flex: 1,
  },
  itemsListContent: {
    paddingBottom: 16,
  },
  resultCard: {
    marginBottom: 8,
  },
  resultTitle: {
    marginBottom: 4,
  },
  resultDescription: {
    marginBottom: 8,
    opacity: 0.8,
  },
  ocrPreview: {
    marginBottom: 8,
    fontStyle: 'italic',
    opacity: 0.7,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 8,
    borderRadius: 4,
  },
  resultMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    opacity: 0.6,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  backButton: {
    color: '#007AFF',
  },
});
