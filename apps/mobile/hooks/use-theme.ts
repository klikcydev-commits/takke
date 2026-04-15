/**
 * @file use-theme.ts
 * custom hook to access the current theme (colors, typography, spacing).
 */

import { useColorScheme } from 'react-native';
import { theme } from '@/constants/theme';

export function useTheme() {
  const colorScheme = useColorScheme() ?? 'light';
  const currentTheme = theme[colorScheme];

  return {
    ...currentTheme,
    isDark: colorScheme === 'dark',
    colorScheme,
  };
}
