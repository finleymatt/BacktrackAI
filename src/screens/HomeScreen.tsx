import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Button } from '../components';
import { useTheme } from '../theme/ThemeContext';
import { getDatabaseStats, DatabaseStats } from '../data';
import { seedDatabase } from '../data/seed';

export const HomeScreen: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const databaseStats = await getDatabaseStats();
      setStats(databaseStats);
    } catch (error) {
      console.error('Failed to load database stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDatabase = async () => {
    try {
      setLoading(true);
      await seedDatabase();
      await loadStats(); // Reload stats after seeding
    } catch (error) {
      console.error('Failed to seed database:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text variant="h1" style={styles.title}>
          Home
        </Text>
        
        <Card style={styles.card}>
          <Text variant="body" style={styles.description}>
            Welcome to your content organizer! This is the home screen where you can view your recent activity and quick actions.
          </Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text variant="caption" style={styles.loadingText}>
                Loading database...
              </Text>
            </View>
          ) : stats ? (
            <View style={styles.statsContainer}>
              <View style={styles.statRow}>
                <Text variant="h3" style={styles.statNumber}>
                  {stats.totalItems}
                </Text>
                <Text variant="body" style={styles.statLabel}>
                  Total Items
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text variant="h3" style={styles.statNumber}>
                  {stats.totalFolders}
                </Text>
                <Text variant="body" style={styles.statLabel}>
                  Folders
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text variant="h3" style={styles.statNumber}>
                  {stats.totalTags}
                </Text>
                <Text variant="body" style={styles.statLabel}>
                  Tags
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text variant="h3" style={styles.statNumber}>
                  {stats.recentItems}
                </Text>
                <Text variant="body" style={styles.statLabel}>
                  Recent (7 days)
                </Text>
              </View>
            </View>
          ) : (
            <Text variant="body" style={styles.errorText}>
              Failed to load database statistics
            </Text>
          )}
          
          <View style={styles.buttonContainer}>
            <Button
              title="Seed Database (Dev)"
              variant="outline"
              onPress={handleSeedDatabase}
              style={[styles.button, styles.seedButton]}
            />
            <Button
              title="Toggle Theme"
              variant="outline"
              onPress={toggleTheme}
              style={styles.button}
            />
          </View>
        </Card>
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
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingText: {
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statRow: {
    alignItems: 'center',
    marginBottom: 12,
    minWidth: 80,
  },
  statNumber: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    textAlign: 'center',
    opacity: 0.7,
  },
  errorText: {
    textAlign: 'center',
    color: 'red',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  button: {
    marginHorizontal: 8,
    marginVertical: 4,
  },
  seedButton: {
    backgroundColor: '#4CAF50',
  },
});
