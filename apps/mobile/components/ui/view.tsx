import { View as RNView, type ViewProps } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  variant?: 'default' | 'surface' | 'accent' | 'none';
};

export function View({ style, lightColor, darkColor, variant = 'default', ...otherProps }: ThemedViewProps) {
  const { colors, colorScheme } = useTheme();

  const getBackgroundColor = () => {
    if (colorScheme === 'light' && lightColor) return lightColor;
    if (colorScheme === 'dark' && darkColor) return darkColor;

    switch (variant) {
      case 'surface':
        return colors.surface;
      case 'accent':
        return colors.accent;
      case 'none':
        return 'transparent';
      default:
        return colors.background;
    }
  };

  return <RNView style={[{ backgroundColor: getBackgroundColor() }, style]} {...otherProps} />;
}
