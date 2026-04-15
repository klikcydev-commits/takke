import { useTheme } from "@/hooks/use-theme";
import { useCartStore } from "@/store/useCartStore";
import { useWishlistStore } from "@/store/useWishlistStore";
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

export interface Product {
  id: string;
  name: string;
  vendor: string;
  price: number;
  image: any;
  onSale?: boolean;
  discount?: string;
}

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  onAddToCart?: () => void;
  onWishlistPress?: () => void;
  isWishlisted?: boolean;
}

export function ProductCard({
  product,
  onPress,
  onAddToCart,
  onWishlistPress,
  isWishlisted,
}: ProductCardProps) {
  const { colors, spacing, typography } = useTheme();
  const router = useRouter();

  const globalIsWishlisted = useWishlistStore((state) =>
    state.wishlistIds.includes(product.id),
  );
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);
  const addToCartAction = useCartStore((state) => state.addToCart);

  const displayWishlisted =
    isWishlisted !== undefined ? isWishlisted : globalIsWishlisted;

  const handleWishlistPress = () => {
    if (onWishlistPress) {
      onWishlistPress();
    } else {
      toggleWishlist(product.id);
    }
  };

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart();
    } else {
      addToCartAction(product);
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/product/${product.id}`);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.9}
        style={{ flex: 1 }}
      >
        {/* Image Header Frame */}
        <RNView
          style={[
            styles.imageContainer,
            { backgroundColor: colors.imageBackground },
          ]}
        >
          <Image
            source={product.image}
            style={styles.image}
            resizeMode="cover"
          />

          {/* Sale Badge */}
          {product.onSale && (
            <RNView
              style={[
                styles.saleBadge,
                {
                  backgroundColor: colors.primaryTransparent,
                  borderColor: colors.primaryBorder,
                },
              ]}
            >
              <Text style={[styles.saleText, { color: colors.primary }]}>
                {product.discount || "SALE"}
              </Text>
            </RNView>
          )}
        </RNView>

        {/* Product Info */}
        <View variant="none" style={styles.infoContainer}>
          <View variant="none" style={{ flex: 1 }}>
            <Text type="defaultSemiBold" numberOfLines={1} style={styles.name}>
              {product.name}
            </Text>
            <Text type="muted" numberOfLines={1} style={styles.vendor}>
              {product.vendor}
            </Text>
          </View>

          {/* Bottom Section: Price & Cart */}
          <RNView style={styles.bottomRow}>
            <Text type="subtitle" style={styles.price}>
              ${product.price.toFixed(2)}
            </Text>

            <TouchableOpacity
              style={[styles.cartButton, { backgroundColor: colors.primary }]}
              onPress={handleAddToCart}
            >
              <IconSymbol name="plus" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </RNView>
        </View>
      </TouchableOpacity>

      {/* Wishlist Button - Absolute positioned outside the main Card Touchable */}
      <TouchableOpacity
        style={[
          styles.wishlistButton,
          {
            backgroundColor: colors.primaryTransparent,
            borderColor: colors.primaryBorder,
          },
        ]}
        onPress={handleWishlistPress}
        activeOpacity={0.7}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <IconSymbol
          name={displayWishlisted ? "heart.fill" : "heart"}
          size={18}
          color={displayWishlisted ? colors.accent : colors.primary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 1,
    position: "relative",
    // Dynamic background set in component

    borderBottomLeftRadius: 32, // 3xl border radius
    borderBottomRightRadius: 32,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  saleBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  saleText: {
    fontSize: 10,
    fontFamily: "NunitoSans_800ExtraBold",
  },
  wishlistButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  infoContainer: {
    padding: 12,
    flex: 1,
    justifyContent: "space-between",
  },
  name: {
    fontSize: 15,
    marginBottom: 2,
  },
  vendor: {
    fontSize: 12,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  price: {
    fontSize: 17,
    fontFamily: "NunitoSans_700Bold",
  },
  cartButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});
