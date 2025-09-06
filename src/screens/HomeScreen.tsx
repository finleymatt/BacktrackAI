import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Button } from '../components';
import { useTheme } from '../theme/ThemeContext';

export const HomeScreen: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

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
          
          <Button
            title="Toggle Theme"
            variant="outline"
            onPress={toggleTheme}
            style={styles.button}
          />
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
  button: {
    alignSelf: 'center',
  },
});
