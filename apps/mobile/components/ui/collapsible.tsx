import { PropsWithChildren, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { colors, spacing } = useTheme();

  return (
    <View>
      <TouchableOpacity
        style={[styles.heading, { gap: spacing.sm }]}
        onPress={() => setIsOpen((value) => !value)}
        activeOpacity={0.8}>
        <IconSymbol
          name="chevron.right"
          size={18}
          weight="medium"
          color={colors.textSecondary}
          style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
        />

        <Text type="defaultSemiBold">{title}</Text>
      </TouchableOpacity>
      {isOpen && <View style={[styles.content, { marginTop: spacing.sm, marginLeft: spacing.xl }]}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {},
});
