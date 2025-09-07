import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, ItemDetail, ItemCard, InstagramPreview, YouTubePreview, UrlPreview } from '../components';
import { useTheme } from '../theme/ThemeContext';
import { ItemsRepository } from '../data/repositories/items';
import { Item, Platform } from '../data/models';

export const SearchScreen: React.FC = () => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Search function
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await ItemsRepository.search(query, 20);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const renderSearchResult = ({ item }: { item: Item }) => {
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
              ← Back to Search
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
          Search
        </Text>
        
        <TextInput
          style={[styles.searchInput, { 
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            color: theme.colors.text 
          }]}
          placeholder="Search items, descriptions, or OCR text..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {searchQuery ? (
          <View style={styles.resultsContainer}>
            <Text variant="h3" style={styles.resultsTitle}>
              {isSearching ? 'Searching...' : `Results (${searchResults.length})`}
            </Text>
            
            {searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item) => item.id}
                style={styles.resultsList}
                showsVerticalScrollIndicator={false}
              />
            ) : !isSearching ? (
              <Card style={styles.noResultsCard}>
                <Text variant="body" style={styles.noResultsText}>
                  No items found matching "{searchQuery}"
                </Text>
              </Card>
            ) : null}
          </View>
        ) : (
          <Card style={styles.card}>
            <Text variant="body" style={styles.description}>
              Search through your organized content, tags, and memories. Find what you're looking for quickly and efficiently.
            </Text>
            <Text variant="caption" style={styles.hint}>
              💡 Try searching for text that might be in screenshots - the OCR feature extracts text from images!
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
  hint: {
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsTitle: {
    marginBottom: 12,
  },
  resultsList: {
    flex: 1,
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
  noResultsCard: {
    marginTop: 16,
  },
  noResultsText: {
    textAlign: 'center',
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
