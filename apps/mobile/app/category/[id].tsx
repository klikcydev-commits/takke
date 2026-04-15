import React from "react";
import { StyleSheet, ScrollView, TouchableOpacity, View } from "react-native";
import { useLayoutStore } from "@/store/useLayoutStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";

export default function CategoryPage() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const topInset = useLayoutStore((state) => state.topInset);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.safe, { paddingTop: topInset }]}>
        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: spacing.xl }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {name || 'Category'}
          </Text>
          <View style={{ width: 24 }} /> {/* Spacer for centering */}
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Placeholder for content */}
          <View style={[styles.content, { padding: spacing.xl }]}>
            <Text type="subtitle" style={{ marginBottom: spacing.md }}>
              Discover {name || 'Items'}
            </Text>
            <Text type="muted">Items matching this category will appear here soon.</Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: 'NunitoSans_700Bold',
  },
  carouselWrapper: {
    marginTop: 10,
  },
  content: {
    alignItems: 'flex-start',
  },
});
