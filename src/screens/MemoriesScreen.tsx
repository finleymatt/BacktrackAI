import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, Card, ItemDetail, ItemCard, InstagramPreview, YouTubePreview, UrlPreview, Button } from '../components';
import { useTheme } from '../theme/ThemeContext';
import { ItemsRepository } from '../data/repositories/items';
import { Item } from '../data/models';
import { 
  getMemoriesWindows, 
  selectMemories, 
  groupMemoriesByPattern,
  MemoryItem,
  MemoriesSettings,
  loadMemoriesSettings,
  saveMemoriesSettings,
  debugMemoriesData,
  createTestMemoriesData,
  triggerMemoriesTestNow,
  requestNotificationPermissions,
  areNotificationsEnabled
} from '../features/memories';

type TabType = 'yearly' | 'monthly';

export const MemoriesScreen: React.FC = () => {
  const { theme } = useTheme();
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [groupedMemories, setGroupedMemories] = useState<{
    yearly: { [year: string]: MemoryItem[] };
    monthly: { [interval: string]: MemoryItem[] };
  }>({ yearly: {}, monthly: {} });
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('yearly');
  const [settings, setSettings] = useState<MemoriesSettings | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    loadMemories();
    checkNotificationStatus();
    checkNotificationFilter();
  }, []);

  const checkNotificationFilter = async () => {
    try {
      const filter = await AsyncStorage.getItem('memories_notification_filter');
      if (filter && (filter === 'yearly' || filter === 'monthly')) {
        setActiveTab(filter);
        // Clear the filter after using it
        await AsyncStorage.removeItem('memories_notification_filter');
      }
    } catch (error) {
      console.error('Error checking notification filter:', error);
    }
  };

  const checkNotificationStatus = async () => {
    const enabled = await areNotificationsEnabled();
    setNotificationsEnabled(enabled);
  };

  const loadMemories = async () => {
    try {
      setLoading(true);
      
      // Load settings
      const memoriesSettings = await loadMemoriesSettings();
      setSettings(memoriesSettings);
      
      // Compute memory windows
      const today = new Date();
      const windows = getMemoriesWindows(today, memoriesSettings);
      
      // Select memories
      const selectedMemories = await selectMemories(windows, memoriesSettings);
      setMemories(selectedMemories);
      
      // Group memories for display
      const grouped = groupMemoriesByPattern(selectedMemories);
      setGroupedMemories(grouped);
      
    } catch (error) {
      console.error('Failed to load memories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMemoryAction = (action: string, memory: MemoryItem) => {
    switch (action) {
      case 'snooze':
        Alert.alert(
          'Snooze Memory',
          'How many days would you like to snooze this memory?',
          [
            { text: '1 day', onPress: () => snoozeMemory(memory, 1) },
            { text: '3 days', onPress: () => snoozeMemory(memory, 3) },
            { text: '1 week', onPress: () => snoozeMemory(memory, 7) },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        break;
      case 'dismiss':
        dismissMemory(memory);
        break;
      case 'show_fewer':
        showFewerLikeThis(memory);
        break;
      case 'add_to_folder':
        // This would open the add to folder modal
        console.log('Add to folder:', memory.id);
        break;
      case 'share':
        // This would open the share modal
        console.log('Share:', memory.id);
        break;
    }
  };

  const snoozeMemory = async (memory: MemoryItem, days: number) => {
    // TODO: Implement snooze logic (store snooze date, remove from current view)
    console.log(`Snoozing memory ${memory.id} for ${days} days`);
    // For now, just remove from current view
    setMemories(prev => prev.filter(m => m.id !== memory.id));
  };

  const dismissMemory = async (memory: MemoryItem) => {
    // TODO: Implement dismiss logic (store dismissed state)
    console.log(`Dismissing memory ${memory.id}`);
    // For now, just remove from current view
    setMemories(prev => prev.filter(m => m.id !== memory.id));
  };

  const showFewerLikeThis = async (memory: MemoryItem) => {
    // TODO: Implement "show fewer like this" logic
    console.log(`Show fewer like this: ${memory.id}`);
  };

  const handleTestNotification = async () => {
    try {
      if (!notificationsEnabled) {
        const granted = await requestNotificationPermissions();
        if (!granted) {
          Alert.alert(
            'Permission Required',
            'Please enable notifications in your device settings to test notifications.',
            [{ text: 'OK' }]
          );
          return;
        }
        setNotificationsEnabled(true);
      }
      
      await triggerMemoriesTestNow();
      Alert.alert(
        'Test Notification',
        'Test notification sent! Check your notification panel.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error testing notification:', error);
      Alert.alert(
        'Error',
        'Failed to send test notification. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderMemoryItem = ({ item }: { item: MemoryItem }) => {
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

  const renderMemoryActions = (memory: MemoryItem) => (
    <View style={styles.memoryActions}>
      <Button
        title="Snooze"
        variant="secondary"
        size="small"
        onPress={() => handleMemoryAction('snooze', memory)}
      />
      <Button
        title="Dismiss"
        variant="secondary"
        size="small"
        onPress={() => handleMemoryAction('dismiss', memory)}
      />
      <Button
        title="Fewer"
        variant="secondary"
        size="small"
        onPress={() => handleMemoryAction('show_fewer', memory)}
      />
    </View>
  );

  const renderTabChips = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[
          styles.tabChip,
          activeTab === 'yearly' && styles.activeTabChip,
          { backgroundColor: activeTab === 'yearly' ? theme.colors.primary : theme.colors.surface }
        ]}
        onPress={() => setActiveTab('yearly')}
      >
        <Text 
          variant="button" 
          style={[
            styles.tabText,
            { color: activeTab === 'yearly' ? theme.colors.onPrimary : theme.colors.onSurface }
          ]}
        >
          On This Day
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.tabChip,
          activeTab === 'monthly' && styles.activeTabChip,
          { backgroundColor: activeTab === 'monthly' ? theme.colors.primary : theme.colors.surface }
        ]}
        onPress={() => setActiveTab('monthly')}
      >
        <Text 
          variant="button" 
          style={[
            styles.tabText,
            { color: activeTab === 'monthly' ? theme.colors.onPrimary : theme.colors.onSurface }
          ]}
        >
          Months Ago
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderYearlySection = () => {
    const yearlyEntries = Object.entries(groupedMemories.yearly).sort(([a], [b]) => parseInt(b) - parseInt(a));
    
    if (yearlyEntries.length === 0) {
      return (
        <Card style={styles.card}>
          <Text variant="body" style={styles.description}>
            No memories from this day in previous years.
          </Text>
        </Card>
      );
    }

    return (
      <ScrollView style={styles.sectionContainer}>
        {yearlyEntries.map(([year, yearMemories]) => (
          <View key={year} style={styles.yearSection}>
            <Text variant="h3" style={styles.sectionTitle}>
              {year} ({yearMemories.length} {yearMemories.length === 1 ? 'memory' : 'memories'})
            </Text>
            {yearMemories.map((memory) => (
              <View key={memory.id} style={styles.memoryContainer}>
                {renderMemoryItem({ item: memory })}
                {renderMemoryActions(memory)}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderMonthlySection = () => {
    const monthlyEntries = Object.entries(groupedMemories.monthly).sort(([a], [b]) => {
      const aMonths = parseInt(a.split(' ')[0]);
      const bMonths = parseInt(b.split(' ')[0]);
      return aMonths - bMonths;
    });
    
    if (monthlyEntries.length === 0) {
      return (
        <Card style={styles.card}>
          <Text variant="body" style={styles.description}>
            No memories from 2, 4, 6, 8, or 10 months ago.
          </Text>
        </Card>
      );
    }

    return (
      <ScrollView style={styles.sectionContainer}>
        {monthlyEntries.map(([interval, intervalMemories]) => (
          <View key={interval} style={styles.monthSection}>
            <Text variant="h3" style={styles.sectionTitle}>
              {interval} ({intervalMemories.length} {intervalMemories.length === 1 ? 'memory' : 'memories'})
            </Text>
            {intervalMemories.map((memory) => (
              <View key={memory.id} style={styles.memoryContainer}>
                {renderMemoryItem({ item: memory })}
                {renderMemoryActions(memory)}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
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
        ) : memories.length > 0 ? (
          <>
            {renderTabChips()}
            {activeTab === 'yearly' ? renderYearlySection() : renderMonthlySection()}
          </>
        ) : (
          <Card style={styles.card}>
            <Text variant="body" style={styles.description}>
              No memories found. Make sure you have items with source dates, or enable fallback to ingestion dates in settings.
            </Text>
            <View style={styles.debugActions}>
              <Button
                title="Debug Data"
                variant="secondary"
                onPress={() => debugMemoriesData()}
              />
              <Button
                title="Create Test Data"
                variant="primary"
                onPress={() => createTestMemoriesData().then(() => loadMemories())}
              />
              <Button
                title="Test Notification"
                variant="secondary"
                onPress={handleTestNotification}
              />
            </View>
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
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  tabChip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  activeTabChip: {
    // Active state styling handled by backgroundColor in component
  },
  tabText: {
    fontWeight: '600',
  },
  sectionContainer: {
    flex: 1,
  },
  yearSection: {
    marginBottom: 24,
  },
  monthSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  memoryContainer: {
    marginBottom: 16,
  },
  memoryActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  backButton: {
    color: '#007AFF',
  },
  debugActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    gap: 12,
  },
});
