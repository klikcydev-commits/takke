import { BrandSection } from "@/components/ui/brand-section";
import { CartButton } from "@/components/ui/cart-button";
import { CollectionSection } from "@/components/ui/collection-section";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Input } from "@/components/ui/input";
import { TabBar } from "@/components/ui/tab-bar";
import { TabPager } from "@/components/ui/tab-pager";
import { Text } from "@/components/ui/text";
import { View } from "@/components/ui/view";
import { STORE_TABS } from "@/constants/mock-data";
import { useTheme } from "@/hooks/use-theme";
import { useLayoutStore } from "@/store/useLayoutStore";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  InteractionManager,
  ScrollView,
  StyleSheet,
} from "react-native";

const { width } = Dimensions.get("window");

export default function StoreScreen() {
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isReady, setIsReady] = useState(false);
  const { colors, spacing } = useTheme();
  const topInset = useLayoutStore((state) => state.topInset);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setIsReady(true);
    });
    return () => task.cancel();
  }, []);

  // Ref to control scrolling programmaticly
  const contentScrollRef = useRef<ScrollView>(null);
  const isProgrammaticScroll = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When a header tab is pressed
  const handleTabPress = (index: number) => {
    if (activeTab === index) return;

    isProgrammaticScroll.current = true;
    setActiveTab(index);

    // Programmatically swipe the content list to the clicked index
    contentScrollRef.current?.scrollTo({
      x: index * width,
      animated: true,
    });

    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Re-enable scroll event processing after scroll animation finishes
    scrollTimeoutRef.current = setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 400);
  };

  // Continuously track scroll to instantly change active tab during swipe
  const handleScroll = (event: any) => {
    if (isProgrammaticScroll.current) return;

    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / width);
    setActiveTab((prevIndex) =>
      prevIndex !== newIndex ? newIndex : prevIndex,
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View variant="none" style={[styles.container, { paddingTop: topInset }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[2]}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* ---- INDEX 0: Header Area ---- */}
          <View style={[styles.header, { backgroundColor: colors.background }]}>
            <View
              variant="none"
              style={{ paddingHorizontal: 24, paddingTop: 16 }}
            >
              <View variant="none" style={styles.headerTopRow}>
                <Text style={styles.headerTitle}>Store</Text>
                <CartButton color={colors.textPrimary} />
              </View>
              <Text
                type="defaultSemiBold"
                style={[styles.headerSubtitle, { color: colors.textSecondary }]}
              >
                Discover premium collections curated just for you.
              </Text>
              <Input
                placeholder="Search products, brands..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                icon={
                  <IconSymbol
                    name="magnifyingglass"
                    size={20}
                    color={colors.textSecondary}
                  />
                }
                variant="search"
                containerStyle={{ marginBottom: spacing.lg }}
              />
            </View>
          </View>

          {/* ---- INDEX 1: Brand Section ---- */}
          <BrandSection isLoading={!isReady} />

          {/* ---- INDEX 2: Sticky Tab Bar ---- */}
          <TabBar
            tabs={STORE_TABS}
            activeTab={activeTab}
            onTabPress={handleTabPress}
          />

          {/* ---- INDEX 2: Swipeable Screen Content ---- */}
          <TabPager
            data={STORE_TABS}
            scrollRef={contentScrollRef}
            onScroll={handleScroll}
            activeTab={activeTab}
            contentContainerStyle={styles.contentContainer}
            renderItem={(tab) => (
              <CollectionSection title={tab} isLoading={!isReady} />
            )}
          />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    width: "100%",
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "NunitoSans_800ExtraBold",
    lineHeight: 34,
  },
  headerTopRow: {
    height: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerSubtitle: {
    marginBottom: 16,
    marginTop: -4,
    opacity: 0.8,
  },
  contentContainer: {
    padding: 24,
    paddingTop: 24,
  },
});
