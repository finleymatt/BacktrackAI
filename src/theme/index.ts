import { lightColors, darkColors, Colors } from './colors';
import { typography, Typography } from './typography';
import { spacing, Spacing } from './spacing';

export interface Theme {
  colors: Colors;
  typography: Typography;
  spacing: Spacing;
  isDark: boolean;
}

export const lightTheme: Theme = {
  colors: lightColors,
  typography,
  spacing,
  isDark: false,
};

export const darkTheme: Theme = {
  colors: darkColors,
  typography,
  spacing,
  isDark: true,
};

export { lightColors, darkColors, typography, spacing };
export type { Colors, Typography, Spacing };
