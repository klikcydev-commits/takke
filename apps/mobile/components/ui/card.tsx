import { useTheme } from '@/hooks/use-theme';
import React from 'react';
import { StyleSheet, View, type TextProps, type ViewProps } from 'react-native';
import { Text } from './text';

export type CardVariant = 'default' | 'outline';

export interface CardProps extends ViewProps {
  children?: React.ReactNode;
  variant?: CardVariant;
}

export function Card({ style, children, variant = 'default', ...props }: CardProps) {
  const { colors } = useTheme();

  const getBackgroundColor = () => {
    if (variant === 'outline') return 'transparent';
    return colors.surface;
  };

  return (
    <View style={[styles.card, { backgroundColor: getBackgroundColor(), borderColor: colors.border }, style]} {...props}>
      {children}
    </View>
  );
}

export function CardHeader({ style, children, ...props }: CardProps) {
  const { spacing } = useTheme();
  return (
    <View style={[styles.cardHeader, { padding: spacing.lg, gap: spacing.xs }, style]} {...props}>
      {children}
    </View>
  );
}

export function CardTitle({ style, children, ...props }: TextProps) {
  return (
    <Text type="subtitle" style={[styles.cardTitle, style]} {...props}>
      {children}
    </Text>
  );
}

export function CardDescription({ style, children, ...props }: TextProps) {
  return (
    <Text type="muted" style={[styles.cardDescription, style]} {...props}>
      {children}
    </Text>
  );
}

export function CardContent({ style, children, ...props }: CardProps) {
  const { spacing } = useTheme();
  return (
    <View style={[styles.cardContent, { padding: spacing.lg, paddingTop: 0 }, style]} {...props}>
      {children}
    </View>
  );
}

export function CardFooter({ style, children, ...props }: CardProps) {
  const { spacing } = useTheme();
  return (
    <View style={[styles.cardFooter, { padding: spacing.lg, paddingTop: 0, gap: spacing.sm }, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1, // Editorial: thin, precise borders
    overflow: 'hidden',
  },
  cardHeader: {},
  cardTitle: {
    fontSize: 20,
    fontFamily: 'NunitoSans_700Bold',
  },
  cardDescription: {
    fontSize: 14,
  },
  cardContent: {},
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
