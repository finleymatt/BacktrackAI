import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme/ThemeContext';
import {
  HomeScreen,
  SearchScreen,
  AddScreen,
  FoldersScreen,
  ProfileScreen,
  MemoriesScreen,
} from '../screens';

const Tab = createBottomTabNavigator();

export const TabNavigator: React.FC = () => {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Search',
        }}
      />
      <Tab.Screen
        name="Add"
        component={AddScreen}
        options={{
          tabBarLabel: 'Add',
        }}
      />
      <Tab.Screen
        name="Folders"
        component={FoldersScreen}
        options={{
          tabBarLabel: 'Folders',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
      <Tab.Screen
        name="Memories"
        component={MemoriesScreen}
        options={{
          tabBarLabel: 'Memories',
        }}
      />
    </Tab.Navigator>
  );
};
