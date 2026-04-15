import { useTheme } from "@/hooks/use-theme";
import { useRouter } from "expo-router";
import React from "react";
import {
    Image,
    View as RNView,
    StyleSheet,
    TouchableOpacity,
} from "react-native";
import { IconSymbol } from "./icon-symbol";
import { Text } from "./text";
import { View } from "./view";

export interface Store {
  id: string;
  name: string;
  logo: any;
  products: any[];
}

interface StoreCardProps {
  store: Store;
  onPress?: () => void;
  onProductPress?: (product: any) => void;
}

export function StoreCard({ store, onPress, onProductPress }: StoreCardProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const handleProductPress = (product: any) => {
    if (onProductPress) {
      onProductPress(product);
    } else {
      router.push(`/product/${product.id}`);
    }
  };

  const heroProduct = store.products[0];
  const secondaryProducts = store.products.slice(1, 3);

  return (
    <View style={styles.container} variant="none">
      {/* Bento Grid layout for products */}
      <RNView style={styles.bentoGrid}>
        {/* Full-width Hero Product */}
        {heroProduct && (
          <TouchableOpacity
            style={styles.heroProduct}
            activeOpacity={0.9}
            onPress={() => handleProductPress(heroProduct)}
          >
            <View
              style={[
                styles.imageContainer,
                { backgroundColor: colors.surface },
              ]}
            >
              <Image
                source={heroProduct.image}
                style={styles.productImage}
                resizeMode="cover"
              />
              <RNView
                style={[
                  styles.priceTag,
                  { backgroundColor: colors.background },
                ]}
              >
                <Text style={styles.priceText}>
                  ${heroProduct.price.toFixed(0)}
                </Text>
              </RNView>
            </View>
          </TouchableOpacity>
        )}

        {/* 50/50 Split Secondary Row */}
        {secondaryProducts.length > 0 && (
          <RNView style={styles.secondaryRow}>
            {secondaryProducts.map((product, idx) => (
              <TouchableOpacity 
                key={`${product.id}-${idx}`}
                style={styles.secondaryProduct}
                activeOpacity={0.9}
                onPress={() => handleProductPress(product)}
              >
                <View
                  style={[
                    styles.imageContainer,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <Image
                    source={product.image}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                  <RNView
                    style={[
                      styles.priceTag,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    <Text style={styles.priceText}>
                      ${product.price.toFixed(0)}
                    </Text>
                  </RNView>
                </View>
              </TouchableOpacity>
            ))}
          </RNView>
        )}
      </RNView>

      {/* Modern, flat footer */}
      <TouchableOpacity
        style={styles.footer}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <RNView style={styles.footerLeft}>
          <RNView
            style={[
              styles.logo,
              {
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: colors.surface,
              },
            ]}
          >
            <IconSymbol name="3d-rotate" size={16} color={colors.textPrimary} />
          </RNView>
          <Text style={styles.storeName}>{store.name}</Text>
        </RNView>

        <RNView style={styles.visitBtn}>
          <Text style={[styles.visitText, { color: colors.textSecondary }]}>
            Visit Store
          </Text>
          <IconSymbol
            name="chevron.right"
            size={16}
            color={colors.textSecondary}
          />
        </RNView>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 28,
    width: "100%",
  },
  bentoGrid: {
    borderRadius: 20,
    overflow: "hidden",
    gap: 4,
  },
  heroProduct: {
    width: "100%",
    aspectRatio: 1.5,
  },
  secondaryRow: {
    flexDirection: "row",
    gap: 4,
  },
  secondaryProduct: {
    flex: 1,
    aspectRatio: 1,
  },
  imageContainer: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  priceTag: {
    position: "absolute",
    bottom: 8,
    left: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  priceText: {
    fontSize: 12,
    fontFamily: "NunitoSans_800ExtraBold",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingHorizontal: 4,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  storeName: {
    fontSize: 15,
    fontFamily: "NunitoSans_700Bold",
    letterSpacing: 0.2,
  },
  visitBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  visitText: {
    fontSize: 13,
    fontFamily: "NunitoSans_600SemiBold",
    marginRight: 2,
  },
});
