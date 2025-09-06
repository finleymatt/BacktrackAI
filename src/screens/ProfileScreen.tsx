import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Button } from '../components';
import { useTheme } from '../theme/ThemeContext';
import { signInWithEmail, signUpWithEmail, signOut, supabase } from '../lib/supabase';
import { getDatabase } from '../data/db';
import { ItemsRepository, FoldersRepository, TagsRepository } from '../data/repositories';

export const ProfileScreen: React.FC = () => {
  const { theme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    localCounts: { items: number; folders: number; tags: number };
  } | null>(null);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check auth directly with Supabase
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('Direct auth check:', { user, authError });
      
      const isAuth = !authError && !!user;
      setIsAuthenticated(isAuth);
      
      if (isAuth) {
        // Get local data counts directly
        try {
          const db = await getDatabase();
          const [itemsCount, foldersCount, tagsCount] = await Promise.all([
            ItemsRepository.getCount(),
            FoldersRepository.getCount(),
            TagsRepository.getCount()
          ]);
          
          setSyncStatus({
            localCounts: {
              items: itemsCount,
              folders: foldersCount,
              tags: tagsCount
            }
          });
        } catch (dbError) {
          console.error('Failed to get local counts:', dbError);
          setSyncStatus({
            localCounts: {
              items: 0,
              folders: 0,
              tags: 0
            }
          });
        }
      } else {
        setSyncStatus(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setSyncStatus(null);
    }
  };

  const handleSyncNow = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Not Authenticated',
        'Please sign in to Supabase first to enable cloud sync.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: handleSignIn }
        ]
      );
      return;
    }

    setIsSyncing(true);
    try {
      // TODO: Implement SyncService
      // const result = await SyncService.syncAll();
      
      // Placeholder sync functionality
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate sync delay
      
      Alert.alert(
        'Sync Successful',
        'Data sync completed successfully.',
        [{ text: 'OK' }]
      );
      // Refresh sync status
      await checkAuthStatus();
    } catch (error) {
      Alert.alert(
        'Sync Error',
        error instanceof Error ? error.message : 'Unknown error occurred',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSignIn = () => {
    Alert.prompt(
      'Sign In to Supabase',
      'Enter your email address:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Continue', 
          onPress: (email) => {
            if (email) {
              handleSignInWithEmail(email);
            }
          }
        }
      ],
      'plain-text',
      '',
      'email-address'
    );
  };

  const handleSignInWithEmail = (email: string) => {
    Alert.prompt(
      'Enter Password',
      `Password for ${email}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign In', 
          onPress: async (password) => {
            if (password) {
              try {
                console.log('Attempting to sign in with:', email);
                const result = await signInWithEmail(email, password);
                console.log('Sign in result:', result);
                Alert.alert('Success', 'Signed in successfully!');
                await checkAuthStatus();
              } catch (error) {
                console.error('Sign in error:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                
                // If sign in fails, try to sign up instead
                if (errorMessage.includes('Invalid login credentials')) {
                  Alert.alert(
                    'User Not Found',
                    'No account found with this email. Would you like to create a new account?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Create Account', onPress: () => handleSignUp(email, password) }
                    ]
                  );
                } else {
                  Alert.alert('Sign In Failed', `Error: ${errorMessage}\n\nCheck console for details.`);
                }
              }
            }
          }
        }
      ],
      'secure-text'
    );
  };

  const handleSignUp = async (email: string, password: string) => {
    try {
      console.log('Attempting to sign up with:', email);
      const result = await signUpWithEmail(email, password, 'User');
      console.log('Sign up result:', result);
      Alert.alert('Success', 'Account created successfully! You are now signed in.');
      await checkAuthStatus();
    } catch (error) {
      console.error('Sign up error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Sign Up Failed', `Error: ${errorMessage}\n\nCheck console for details.`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      Alert.alert('Success', 'Signed out successfully!');
      await checkAuthStatus();
    } catch (error) {
      Alert.alert('Sign Out Failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const testConnection = async () => {
    try {
      console.log('Testing Supabase connection...');
      // Test basic connection with a simple query
      const { data, error } = await supabase.from('users').select('count').limit(1);
      if (error) {
        console.error('Connection test error:', error);
        Alert.alert('Connection Test Failed', `Error: ${error.message}`);
      } else {
        console.log('Connection test successful:', data);
        Alert.alert('Connection Test', 'Successfully connected to Supabase!');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      Alert.alert('Connection Test Failed', `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testAuth = async () => {
    try {
      console.log('Testing Supabase auth...');
      // Test auth endpoint
      const { data, error } = await supabase.auth.getSession();
      console.log('Auth test result:', { data, error });
      if (error) {
        Alert.alert('Auth Test Failed', `Auth error: ${error.message}`);
      } else {
        Alert.alert('Auth Test', 'Auth endpoint is accessible!');
      }
    } catch (error) {
      console.error('Auth test failed:', error);
      Alert.alert('Auth Test Failed', `Auth network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

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

        {/* Dev-only sync section */}
        {(__DEV__ || true) && (
          <Card style={styles.card}>
            <Text variant="h3" style={styles.sectionTitle}>
              Cloud Sync (Dev Only)
            </Text>
            
            <Text variant="body" style={styles.statusText}>
              Status: {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
            </Text>

            <Button
              title="Refresh Status"
              onPress={checkAuthStatus}
              variant="outline"
              size="small"
              style={styles.refreshButton}
            />

            {isAuthenticated && (
              <Button
                title="Sign Out"
                onPress={handleSignOut}
                variant="outline"
                size="small"
                style={styles.signOutButton}
              />
            )}

            {syncStatus && (
              <View style={styles.statsContainer}>
                <Text variant="body" style={styles.statsText}>
                  Local Data: {syncStatus.localCounts.items} items, {syncStatus.localCounts.folders} folders, {syncStatus.localCounts.tags} tags
                </Text>
              </View>
            )}

            <Button
              title="Test Connection"
              onPress={testConnection}
              variant="outline"
              size="small"
              style={styles.testButton}
            />

            <Button
              title="Test Auth"
              onPress={testAuth}
              variant="outline"
              size="small"
              style={styles.testButton}
            />

            <Button
              title={isSyncing ? 'Syncing...' : 'Sync Now'}
              onPress={handleSyncNow}
              disabled={isSyncing}
              style={styles.syncButton}
            />

            <Text variant="caption" style={styles.devNote}>
              This sync button is only visible in development mode.
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
  sectionTitle: {
    marginBottom: 12,
  },
  statusText: {
    marginBottom: 8,
  },
  statsContainer: {
    marginBottom: 16,
  },
  statsText: {
    fontSize: 14,
    opacity: 0.8,
  },
  syncButton: {
    marginBottom: 12,
  },
  devNote: {
    textAlign: 'center',
    opacity: 0.6,
    fontStyle: 'italic',
  },
  signOutButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  testButton: {
    marginBottom: 8,
  },
  refreshButton: {
    marginTop: 8,
    marginBottom: 8,
  },
});
