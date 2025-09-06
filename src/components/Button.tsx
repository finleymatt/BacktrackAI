import React from 'react';
import { 
  TouchableOpacity, 
  TouchableOpacityProps, 
  StyleSheet, 
  ViewStyle 
} from 'react-native';
import { Text } from './Text';
import { useTheme } from '../theme/ThemeContext';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  style,
  disabled,
  ...props
}) => {
  const { theme } = useTheme();

  const buttonStyle: ViewStyle[] = [
    styles.base,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    { backgroundColor: getBackgroundColor(variant, theme.colors) },
    { borderColor: getBorderColor(variant, theme.colors) },
    style,
  ];

  const textColor = getTextColor(variant, theme.colors);

  return (
    <TouchableOpacity
      style={buttonStyle}
      disabled={disabled}
      activeOpacity={0.7}
      {...props}
    >
      <Text variant="button" color={textColor}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const getBackgroundColor = (variant: string, colors: any) => {
  switch (variant) {
    case 'primary':
      return colors.primary;
    case 'secondary':
      return colors.secondary;
    case 'outline':
      return 'transparent';
    default:
      return colors.primary;
  }
};

const getBorderColor = (variant: string, colors: any) => {
  switch (variant) {
    case 'outline':
      return colors.primary;
    default:
      return 'transparent';
  }
};

const getTextColor = (variant: string, colors: any) => {
  switch (variant) {
    case 'primary':
    case 'secondary':
      return colors.background;
    case 'outline':
      return colors.primary;
    default:
      return colors.background;
  }
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  primary: {},
  secondary: {},
  outline: {
    borderWidth: 1,
  },
  small: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  medium: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  large: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 52,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
});
