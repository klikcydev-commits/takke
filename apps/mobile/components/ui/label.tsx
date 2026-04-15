import React from 'react';
import { StyleSheet, type TextProps } from 'react-native';
import { Text } from './text';

export interface LabelProps extends TextProps {
  children: React.ReactNode;
}

export function Label({ children, style, ...props }: LabelProps) {
  return (
    <Text
      type="defaultSemiBold"
      style={[styles.label, style]}
      {...props}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
});
