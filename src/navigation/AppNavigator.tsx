import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../theme/ThemeContext';
import { TabNavigator } from './TabNavigator';
import { FolderDetailScreen, PrivacyScreen } from '../screens';

const Stack = createStackNavigator();

export const AppNavigator: React.FC = () => {
  const { theme } = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: {
            backgroundColor: theme.colors.background,
          },
        }}
      >
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen 
          name="FolderDetail" 
          component={FolderDetailScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="Privacy" 
          component={PrivacyScreen}
          options={{
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
