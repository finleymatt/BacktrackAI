import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  padding?: 'none' | 'small' | 'medium' | 'large';
  elevation?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = 'medium',
  elevation = true,
  style,
  ...props
}) => {
  const { theme } = useTheme();

  const cardStyle = [
    styles.base,
    styles[padding],
    {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
    },
    elevation && styles.elevation,
    style,
  ];

  return (
    <View style={cardStyle} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    borderWidth: 1,
  },
  none: {
    padding: 0,
  },
  small: {
    padding: 8,
  },
  medium: {
    padding: 16,
  },
  large: {
    padding: 24,
  },
  elevation: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
