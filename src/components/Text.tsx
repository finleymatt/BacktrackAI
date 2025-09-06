import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface TextProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'bodySmall' | 'caption' | 'button';
  color?: string;
}

export const Text: React.FC<TextProps> = ({ 
  variant = 'body', 
  color, 
  style, 
  children, 
  ...props 
}) => {
  const { theme } = useTheme();
  
  const textStyle = [
    styles.base,
    theme.typography[variant],
    { color: color || theme.colors.text },
    style,
  ];

  return (
    <RNText style={textStyle} {...props}>
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({
  base: {
    fontFamily: 'System',
  },
});
