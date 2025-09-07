import React from 'react';
import { 
  TextInput as RNTextInput, 
  TextInputProps as RNTextInputProps, 
  StyleSheet, 
  View,
  ViewStyle 
} from 'react-native';
import { Text } from './Text';
import { useTheme } from '../theme/ThemeContext';

interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  variant?: 'default' | 'outlined';
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  error,
  containerStyle,
  variant = 'default',
  style,
  ...props
}) => {
  const { theme } = useTheme();

  const inputStyle = [
    styles.base,
    styles[variant],
    {
      borderColor: error ? theme.colors.error : theme.colors.border,
      color: theme.colors.text,
    },
    style,
  ];

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text variant="bodySmall" style={[styles.label, { color: theme.colors.text }]}>
          {label}
        </Text>
      )}
      <RNTextInput
        style={inputStyle}
        placeholderTextColor={theme.colors.textSecondary}
        {...props}
      />
      {error && (
        <Text variant="caption" style={[styles.error, { color: theme.colors.error }]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    fontWeight: '500',
  },
  base: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    minHeight: 44,
  },
  default: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  error: {
    marginTop: 4,
  },
});
