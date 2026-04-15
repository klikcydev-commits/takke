import { IconSymbol } from "@/components/ui/icon-symbol";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { View } from "@/components/ui/view";
import { useTheme } from "@/hooks/use-theme";
import { useLayoutStore } from "@/store/useLayoutStore";
import { Link } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity } from "react-native";

import { Carousel } from "@/components/ui/carousel";
import { CartButton } from "@/components/ui/cart-button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { ProductCard } from "@/components/ui/product-card";
import { Sheet } from "@/components/ui/sheet";
import { BANNERS, CATEGORIES, PRODUCTS } from "@/constants/mock-data";

export default function HomeScreen() {
  const { colors, spacing } = useTheme();
  const [isLoadingCarousel, setIsLoadingCarousel] = useState(true);
  const topInset = useLayoutStore((state) => state.topInset);

  useEffect(() => {
    // Simulate loading carousel items
    const timer = setTimeout(() => {
      setIsLoadingCarousel(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View
      variant="none"
      style={[styles.container, { backgroundColor: colors.primary }]}
    >
      <View variant="none" style={[styles.content, { paddingTop: topInset }]}>
        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* Header Section */}
          <View variant="none" style={styles.header}>
            <View
              variant="none"
              style={{ paddingHorizontal: 24, paddingTop: 16 }}
            >
              <View variant="none" style={styles.headerTopRow}>
                <Text style={styles.headerTitle}>Marketplace</Text>
                <CartButton />
              </View>
              <Text
                type="defaultSemiBold"
                style={{
                  color: "rgba(255,255,255,0.8)",
                  marginTop: -4,
                  marginBottom: spacing.lg,
                }}
              >
                Hello, Marwan!
              </Text>

              <Input
                placeholder="Search in marketplace"
                variant="glass"
                icon={
                  <IconSymbol
                    name="magnifyingglass"
                    size={20}
                    color="#FFFFFF"
                  />
                }
                containerStyle={{ marginTop: 0, marginBottom: spacing.lg }}
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.categoriesContainer,
                { paddingHorizontal: spacing.xl },
              ]}
            >
              {CATEGORIES.map((category) => (
                <Link
                  key={category.id}
                  href={{
                    pathname: "/category/[id]",
                    params: { id: category.id, name: category.name },
                  }}
                  asChild
                >
                  <TouchableOpacity style={styles.categoryItem}>
                    <CategoryIcon name={category.icon} variant="glass" />
                    <Text
                      type="small"
                      style={[
                        styles.categoryLabel,
                        {
                          color: "rgba(255,255,255,0.9)",
                          fontFamily: "NunitoSans_600SemiBold",
                        },
                      ]}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                </Link>
              ))}
            </ScrollView>

            {/* Spacing for sheet overlap */}
            <View variant="none" style={{ height: spacing.lg }} />
          </View>

          {/* Bottom Sheet Section */}
          <Sheet paddingTop={spacing.lg}>
            <View style={{ marginBottom: spacing.xs }}>
              <Carousel images={BANNERS} isLoading={isLoadingCarousel} />
            </View>

            <View
              variant="none"
              style={{
                paddingHorizontal: spacing.xl,
                paddingBottom: spacing.huge,
              }}
            >
              <View variant="none" style={{ marginBottom: spacing.xl }}>
                <Text type="subtitle" style={{ marginBottom: spacing.xs }}>
                  Latest Listings
                </Text>
                <Text type="muted">
                  Discover items, services and more based on your interests.
                </Text>
              </View>

              {/* 2-Column Grid */}
              <View variant="none" style={styles.productsGrid}>
                {PRODUCTS.map((product, index) => (
                  <View key={product.id} variant="none" style={styles.gridItem}>
                    <ProductCard product={product} />
                  </View>
                ))}
              </View>
            </View>
          </Sheet>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    width: "100%",
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "NunitoSans_800ExtraBold",
    lineHeight: 34,
    color: "#FFFFFF",
  },
  headerTopRow: {
    height: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoriesContainer: {
    paddingVertical: 0,
    gap: 20,
  },
  categoryItem: {
    alignItems: "center",
    width: 65,
  },
  categoryLabel: {
    fontSize: 11,
    textAlign: "center",
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginHorizontal: -8, // Offset internal padding for edge alignment
  },
  gridItem: {
    width: "50%",
    paddingHorizontal: 8,
  },
});
