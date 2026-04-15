import React from 'react';
import { StyleSheet, View as RNView, type ViewStyle, type StyleProp } from 'react-native';
import { IconSymbol } from './icon-symbol';
import { useTheme } from '@/hooks/use-theme';

interface CategoryIconProps {
  name: string;
  size?: number;
  variant?: 'glass' | 'default';
  style?: StyleProp<ViewStyle>;
}

export function CategoryIcon({ name, size = 24, variant = 'glass', style }: CategoryIconProps) {
  const { colors } = useTheme();

  const isGlass = variant === 'glass';

  return (
    <RNView
      style={[
        styles.container,
        {
          backgroundColor: isGlass ? 'rgba(255, 255, 255, 0.2)' : colors.surface,
          borderColor: isGlass ? 'rgba(255, 255, 255, 0.1)' : colors.border,
        },
        style,
      ]}
    >
      <IconSymbol 
        name={name} 
        size={size} 
        color={isGlass ? '#FFFFFF' : colors.textPrimary} 
      />
    </RNView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});
