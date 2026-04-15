import React from 'react';
import { StyleSheet, View as RNView, type ViewProps } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface SheetProps extends ViewProps {
  children: React.ReactNode;
  paddingTop?: number;
}

/**
 * A reusable "bottom sheet" style container that clips children with rounded corners.
 */
export function Sheet({ children, style, paddingTop, ...props }: SheetProps) {
  const { colors, spacing } = useTheme();

  return (
    <RNView
      style={[
        styles.sheet,
        { 
          backgroundColor: colors.background, 
          paddingTop: paddingTop ?? spacing.lg 
        },
        style,
      ]}
      {...props}
    >
      {children}
    </RNView>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    flex: 1,
  },
});
