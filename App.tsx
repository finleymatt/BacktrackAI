import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from './src/theme/ThemeContext';
import { AppNavigator } from './src/navigation';

export default function App() {
  return (
    <ThemeProvider>
      <AppNavigator />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
