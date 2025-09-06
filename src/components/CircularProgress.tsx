import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../theme/ThemeContext';

interface CircularProgressProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  children?: React.ReactNode;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 120,
  strokeWidth = 8,
  showPercentage = true,
  children,
}) => {
  const { theme } = useTheme();
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background circle using border */}
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: theme.colors.border,
          },
        ]}
      />
      
      {/* Progress indicator using a rotating element */}
      <View
        style={[
          styles.progressContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        <View
          style={[
            styles.progressBar,
            {
              width: size / 2,
              height: strokeWidth,
              backgroundColor: theme.colors.primary,
              transform: [
                { rotate: `${(progress / 100) * 360}deg` },
                { translateX: size / 4 },
              ],
            },
          ]}
        />
      </View>
      
      <View style={styles.content}>
        {showPercentage && (
          <Text variant="h2" style={[styles.percentage, { color: theme.colors.primary }]}>
            {Math.round(progress)}%
          </Text>
        )}
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  circle: {
    position: 'absolute',
    borderStyle: 'solid',
  },
  progressContainer: {
    position: 'absolute',
    overflow: 'hidden',
  },
  progressBar: {
    position: 'absolute',
    top: '50%',
    left: 0,
    marginTop: -2, // Half of strokeWidth
    transformOrigin: '100% 50%',
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  percentage: {
    fontWeight: 'bold',
  },
});
