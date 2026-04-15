import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

export interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  style?: ViewStyle;
}

export function Separator({
  orientation = 'horizontal',
  style,
}: SeparatorProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.base,
        orientation === 'horizontal' ? styles.horizontal : styles.vertical,
        { backgroundColor: colors.border },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'stretch',
  },
  horizontal: {
    height: 1, // Subtle editorial border
    width: '100%',
  },
  vertical: {
    width: 1,
    height: '100%',
  },
});
