import { Text as RNText, StyleSheet, type TextProps } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'muted' | 'small' | 'large' | 'h1' | 'h2' | 'h3' | 'body' | 'button';
};

export function Text({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const { colors, typography, colorScheme } = useTheme();

  const getColor = () => {
    if (colorScheme === 'light' && lightColor) return lightColor;
    if (colorScheme === 'dark' && darkColor) return darkColor;

    switch (type) {
      case 'muted':
        return colors.textSecondary;
      case 'link':
        return colors.accent;
      default:
        return colors.textPrimary;
    }
  };

  const styleByType = () => {
    switch (type) {
      case 'h1':
      case 'title':
        return typography.h1;
      case 'h2':
      case 'subtitle':
        return typography.h2;
      case 'h3':
      case 'large':
        return typography.h3;
      case 'body':
      case 'default':
        return typography.body;
      case 'defaultSemiBold':
        return typography.bodyBold;
      case 'button':
        return typography.button;
      case 'small':
      case 'muted':
        return typography.small;
      default:
        return typography.body;
    }
  };

  return (
    <RNText
      style={[
        { color: getColor() },
        styleByType(),
        style,
      ]}
      {...rest}
    />
  );
}
