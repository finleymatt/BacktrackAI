import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card } from '../components';
import { useTheme } from '../theme/ThemeContext';

export const ProfileScreen: React.FC = () => {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text variant="h1" style={styles.title}>
          Profile
        </Text>
        
        <Card style={styles.card}>
          <Text variant="body" style={styles.description}>
            Manage your profile settings, preferences, and account information. Customize your experience and privacy settings.
          </Text>
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
    textAlign: 'center',
  },
});
