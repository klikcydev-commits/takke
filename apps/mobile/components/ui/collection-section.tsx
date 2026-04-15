import { IconSymbol } from "@/components/ui/icon-symbol";
import { ProductCard } from "@/components/ui/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { StoreCard } from "@/components/ui/store-card";
import { Text } from "@/components/ui/text";
import { View } from "@/components/ui/view";
import { PRODUCTS, STORES } from "@/constants/mock-data";
import { useTheme } from "@/hooks/use-theme";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  InteractionManager,
  View as RNView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

const { width } = Dimensions.get("window");

interface CollectionSectionProps {
  title: string;
  onViewAll?: () => void;
  isLoading?: boolean;
}

export function CollectionSection({
  title,
  onViewAll,
  isLoading: propIsLoading,
}: CollectionSectionProps) {
  const { colors } = useTheme();
  const [internalLoading, setInternalLoading] = useState(true);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setInternalLoading(false);
    });
    return () => task.cancel();
  }, []);

  const isLoading = propIsLoading !== undefined ? propIsLoading : internalLoading;

  if (isLoading) {
    return (
      <View style={styles.container} variant="none">
        {/* Featured Stores Skeleton */}
        <View style={styles.featuredSection} variant="none">
          <Skeleton width={180} height={24} style={{ marginBottom: 2 }} />
          <RNView style={styles.storesList}>
            {[1, 2].map((key) => (
              <View key={key} style={{ marginBottom: 28 }} variant="none">
                <RNView style={styles.bentoGrid}>
                  <Skeleton
                    width="100%"
                    style={{ aspectRatio: 1.5 }}
                    borderRadius={0}
                  />
                  <RNView style={{ flexDirection: "row", gap: 4 }}>
                    <Skeleton
                      width="50%"
                      style={{ aspectRatio: 1 }}
                      borderRadius={0}
                    />
                    <Skeleton
                      width="50%"
                      style={{ aspectRatio: 1 }}
                      borderRadius={0}
                    />
                  </RNView>
                </RNView>
                <RNView style={styles.storeCardFooter}>
                  <RNView
                    style={{ flexDirection: "row", alignItems: "center" }}
                  >
                    <Skeleton
                      width={32}
                      height={32}
                      borderRadius={16}
                      style={{ marginRight: 10 }}
                    />
                    <Skeleton width={110} height={18} />
                  </RNView>
                  <Skeleton width={75} height={16} />
                </RNView>
              </View>
            ))}
          </RNView>
        </View>

        {/* Grid Section Heading Skeleton */}
        <View style={styles.sectionHeader} variant="none">
          <Skeleton width={130} height={24} />
          <Skeleton width={55} height={16} />
        </View>

        {/* Product Grid Skeleton */}
        <View style={styles.grid} variant="none">
          {[1, 2, 3, 4].map((key) => (
            <RNView key={key} style={styles.productCardWrapper}>
              <View
                style={{
                  flex: 1,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: colors.border,
                  overflow: "hidden",
                  marginBottom: 16,
                }}
                variant="none"
              >
                <Skeleton
                  width="100%"
                  style={{
                    aspectRatio: 1,
                    borderBottomLeftRadius: 32,
                    borderBottomRightRadius: 32,
                  }}
                  borderRadius={0}
                />
                <View style={{ padding: 12 }} variant="none">
                  <Skeleton
                    width="90%"
                    height={16}
                    style={{ marginBottom: 4 }}
                  />
                  <Skeleton
                    width="60%"
                    height={12}
                    style={{ marginBottom: 16 }}
                  />
                  <RNView
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Skeleton width={50} height={20} />
                    <Skeleton width={32} height={32} borderRadius={10} />
                  </RNView>
                </View>
              </View>
            </RNView>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container} variant="none">
      {/* Featured Stores */}
      <View style={styles.featuredSection} variant="none">
        <Text type="subtitle" style={styles.sectionHeading}>
          Featured in {title}
        </Text>
        <RNView style={styles.storesList}>
          {STORES.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </RNView>
      </View>

      {/* Grid Section Heading */}
      <View style={styles.sectionHeader} variant="none">
        <Text type="subtitle" style={styles.sectionHeading}>
          You might like
        </Text>
        <TouchableOpacity
          onPress={onViewAll}
          style={styles.viewAllBtnContainer}
        >
          <Text style={[styles.viewAllText, { color: colors.textSecondary }]}>
            View all
          </Text>
          <IconSymbol
            name="chevron.right"
            size={16}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Product Grid */}
      <View style={styles.grid} variant="none">
        {PRODUCTS.map((product) => (
          <RNView key={product.id} style={styles.productCardWrapper}>
            <ProductCard product={product} />
          </RNView>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  featuredSection: {
    marginBottom: 32,
  },
  storesList: {
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 20,
    fontFamily: "NunitoSans_700Bold",
  },
  viewAllBtnContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllText: {
    fontSize: 13,
    fontFamily: "NunitoSans_600SemiBold",
    marginRight: 2,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  productCardWrapper: {
    width: (width - 60) / 2,
    marginBottom: 4,
  },
  storeCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingHorizontal: 4,
  },
  bentoGrid: {
    borderRadius: 20,
    overflow: "hidden",
    gap: 4,
  },
});
