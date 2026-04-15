import React from 'react';
import {
  TextInput as RNTextInput,
  View,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Text } from './text';
import { useTheme } from '@/hooks/use-theme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'glass' | 'search';
  containerStyle?: ViewStyle;
  wrapperStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  icon,
  size = 'default',
  variant = 'default',
  containerStyle,
  wrapperStyle,
  style,
  multiline,
  ...props
}: InputProps) {
  const { colors, spacing } = useTheme();

  const isGlass = variant === 'glass';

  return (
    <View style={[styles.container, { gap: spacing.xs }, containerStyle]}>
      {label && <Text type="defaultSemiBold" style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: isGlass ? 'rgba(255, 255, 255, 0.2)' : colors.surface,
            borderColor: error ? '#ef4444' : (isGlass ? 'rgba(255, 255, 255, 0.1)' : variant === 'search' ? 'transparent' : colors.border),
            paddingHorizontal: spacing.md,
            gap: spacing.md,
            alignItems: multiline ? 'flex-start' : 'center',
            paddingVertical: multiline ? spacing.sm : 0,
            minHeight: multiline ? 100 : size === 'lg' ? 52 : size === 'sm' ? 34 : 40,
            borderRadius: size === 'lg' || variant === 'search' ? 32 : size === 'sm' ? 17 : 24,
            elevation: variant === 'search' ? 2 : 0,
            shadowColor: variant === 'search' ? '#000' : 'transparent',
            shadowOffset: variant === 'search' ? { width: 0, height: 2 } : { width: 0, height: 0 },
            shadowOpacity: variant === 'search' ? 0.05 : 0,
            shadowRadius: variant === 'search' ? 8 : 0,
          },
          wrapperStyle,
        ]}
      >
        {icon && <View style={[styles.iconWrapper, multiline && { marginTop: spacing.xs }]}>{icon}</View>}
        <RNTextInput
          style={[
            styles.input,
            {
              color: isGlass ? '#FFFFFF' : colors.textPrimary,
              paddingVertical: size === 'lg' ? spacing.md : size === 'sm' ? spacing.xs : spacing.sm,
              minHeight: multiline ? 80 : size === 'lg' ? 52 : size === 'sm' ? 34 : 40,
              textAlignVertical: multiline ? 'top' : 'center',
            },
            style,
          ]}
          multiline={multiline}
          placeholderTextColor={isGlass ? 'rgba(255, 255, 255, 0.6)' : colors.textSecondary}
          {...props}
        />
      </View>
      {error && <Text type="small" style={[styles.error, { color: '#ef4444' }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    borderWidth: 1.5,
  },
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    maxHeight: '100%', 
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  error: {
    marginTop: 4,
  },
});
