import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { View } from './view';
import { Text } from './text';
import { Button } from './button';
import { IconSymbol, IconSymbolName } from './icon-symbol';
import { useTheme } from '@/hooks/use-theme';

interface EmptyStateProps {
  icon: IconSymbolName;
  title: string;
  description: string;
  buttonLabel?: string;
  onButtonPress?: () => void;
  style?: ViewStyle;
}

export function EmptyState({
  icon,
  title,
  description,
  buttonLabel,
  onButtonPress,
  style,
}: EmptyStateProps) {
  const { colors, spacing } = useTheme();

  return (
    <View variant="none" style={[styles.container, style]}>
      <View variant="none" style={styles.iconContainer}>
        <IconSymbol name={icon} size={64} color={colors.textSecondary} />
      </View>

      <View variant="none" style={styles.content}>
        <Text type="subtitle" style={[styles.title, { marginBottom: spacing.sm, color: colors.textPrimary }]} numberOfLines={2}>
          {title}
        </Text>
        <Text type="muted" style={[styles.description, { color: colors.textSecondary }]}>
          {description}
        </Text>

        {buttonLabel && (
          <Button
            label={buttonLabel}
            onPress={onButtonPress}
            variant="outline"
            size="lg"
            style={styles.button}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    opacity: 0.5,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 20,
    fontFamily: 'NunitoSans_800ExtraBold',
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 16,
    maxWidth: 280,
  },
  button: {
    marginTop: 32,
    minWidth: 180,
  },
});
