import { Button } from "@/components/ui/button";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Product } from "@/components/ui/product-card";
import { PRODUCT_DETAILS } from "@/constants/mock-data";
import { useTheme } from "@/hooks/use-theme";
import { useCartStore } from "@/store/useCartStore";
import { useWishlistStore } from "@/store/useWishlistStore";
import { useRouter } from "expo-router";
import { Minus, Plus } from "lucide-react-native";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { moderateScale } from "react-native-size-matters";

const { width } = Dimensions.get("window");

export default function ProductDetailsScreen() {
  const router = useRouter();
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();

  const [selectedColor, setSelectedColor] = useState(PRODUCT_DETAILS.colors[1]);
  const [selectedSize, setSelectedSize] = useState(PRODUCT_DETAILS.sizes[0]);
  const [quantity, setQuantity] = useState(1);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const { addToCart } = useCartStore();
  const { wishlistIds, toggleWishlist } = useWishlistStore();

  const isWishlisted = wishlistIds.includes(PRODUCT_DETAILS.id);

  const handleAddToCart = () => {
    const product: Product = {
      id: PRODUCT_DETAILS.id,
      name: PRODUCT_DETAILS.name,
      vendor: PRODUCT_DETAILS.brand.name,
      price: PRODUCT_DETAILS.salePrice,
      image: PRODUCT_DETAILS.images[0],
      onSale: PRODUCT_DETAILS.salePrice < PRODUCT_DETAILS.originalPrice,
    };
    addToCart(product, quantity);
  };

  const isSelectedColor = (color: string) => selectedColor === color;
  const isSelectedSize = (size: string) => selectedSize === size;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 120 + insets.bottom },
        ]}
      >
        {/* --- Product Image Slider & Header Section --- */}
        <View
          style={[
            styles.imageSliderContainer,
            { backgroundColor: colors.imageBackground },
          ]}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.headerIcon}
            >
              <IconSymbol
                name="chevron.left"
                size={24}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIcon}
              onPress={() => toggleWishlist(PRODUCT_DETAILS.id)}
            >
              <IconSymbol
                name={isWishlisted ? "heart.fill" : "heart"}
                size={24}
                color={isWishlisted ? colors.primary : colors.textPrimary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.imageWrapper}>
            <Image
              source={PRODUCT_DETAILS.images[0]}
              style={[styles.mainImage, { borderRadius: 32 }]}
              resizeMode="cover"
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailList}
          >
            {PRODUCT_DETAILS.images.slice(1).map((uri, index) => (
              <TouchableOpacity key={index}>
                <Image
                  source={uri}
                  style={[
                    styles.thumbnail,
                    { borderRadius: 16, marginRight: 12 },
                  ]}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.detailsContainer}>
          {/* --- Rating & Share --- */}
          <View style={styles.rowBetween}>
            <View style={styles.ratingContainer}>
              <IconSymbol name="rate" size={20} color="#FFD700" />
              <Text
                style={[
                  { marginLeft: 6 },
                  typography.body,
                  { color: colors.textSecondary },
                ]}
              >
                <Text
                  style={[typography.bodyBold, { color: colors.textPrimary }]}
                >
                  {PRODUCT_DETAILS.rating}
                </Text>{" "}
                ({PRODUCT_DETAILS.reviewCount})
              </Text>
            </View>
            <TouchableOpacity>
              <IconSymbol
                name="square.and.arrow.up"
                size={24}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
          </View>

          {/* --- Product Meta Data --- */}
          <View style={styles.metaDataContainer}>
            <View style={styles.priceRow}>
              <View style={styles.saleTag}>
                <Text style={styles.saleTagText}>SALE</Text>
              </View>
              <Text style={[styles.oldPrice, { color: colors.textSecondary }]}>
                ${PRODUCT_DETAILS.originalPrice.toFixed(2)}
              </Text>
              <Text style={[typography.h1, { color: colors.primary }]}>
                ${PRODUCT_DETAILS.salePrice.toFixed(2)}
              </Text>
            </View>

            <Text
              style={[
                typography.h1,
                { marginBottom: 10, color: colors.textPrimary },
              ]}
            >
              {PRODUCT_DETAILS.name}
            </Text>

            <View style={styles.stockRow}>
              <Text
                style={[
                  typography.body,
                  { marginRight: 8, color: colors.textSecondary },
                ]}
              >
                Status
              </Text>
              <Text style={[typography.bodyBold, { color: "#388E3C" }]}>
                {PRODUCT_DETAILS.status}
              </Text>
            </View>

            <View style={styles.brandRow}>
              <Image
                source={{ uri: PRODUCT_DETAILS.brand.logo }}
                style={[styles.brandLogo, { backgroundColor: colors.surface }]}
              />
              <Text
                style={[
                  typography.bodyBold,
                  { marginRight: 4, color: colors.textPrimary },
                ]}
              >
                {PRODUCT_DETAILS.brand.name}
              </Text>
            </View>
          </View>

          {/* --- Product Attributes --- */}
          <View
            style={[
              styles.attributesCard,
              {
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.rowBetween}>
              <Text style={[typography.h3, { color: colors.textPrimary }]}>
                Variation
              </Text>
              <View style={styles.variationPricing}>
                <View style={styles.row}>
                  <Text
                    style={[typography.small, { color: colors.textSecondary }]}
                  >
                    Price :{" "}
                  </Text>
                  <Text
                    style={[
                      typography.small,
                      {
                        color: colors.textSecondary,
                        textDecorationLine: "line-through",
                        marginRight: 8,
                      },
                    ]}
                  >
                    ${PRODUCT_DETAILS.originalPrice}
                  </Text>
                  <Text
                    style={[typography.bodyBold, { color: colors.textPrimary }]}
                  >
                    ${PRODUCT_DETAILS.salePrice}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text
                    style={[typography.small, { color: colors.textSecondary }]}
                  >
                    Stock :{" "}
                  </Text>
                  <Text
                    style={[typography.bodyBold, { color: colors.textPrimary }]}
                  >
                    {PRODUCT_DETAILS.status}
                  </Text>
                </View>
              </View>
            </View>
            <Text
              numberOfLines={4}
              style={[
                typography.body,
                { color: colors.textSecondary, marginTop: 10 },
              ]}
            >
              {PRODUCT_DETAILS.shortDescription}
            </Text>
          </View>

          {/* Colors */}
          <View style={styles.attributeSection}>
            <Text style={[typography.h3, { color: colors.textPrimary }]}>
              Colors
            </Text>
            <View style={styles.chipRow}>
              {PRODUCT_DETAILS.colors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.chip,
                    { borderColor: colors.border },
                    isSelectedColor(color) && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  <Text
                    style={[
                      typography.body,
                      { color: colors.textPrimary },
                      isSelectedColor(color) && {
                        color: colors.buttonText,
                        fontWeight: "bold",
                      },
                    ]}
                  >
                    {color}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Size */}
          <View style={styles.attributeSection}>
            <Text style={[typography.h3, { color: colors.textPrimary }]}>
              Size
            </Text>
            <View style={styles.chipRow}>
              {PRODUCT_DETAILS.sizes.map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.chip,
                    { borderColor: colors.border },
                    isSelectedSize(size) && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setSelectedSize(size)}
                >
                  <Text
                    style={[
                      typography.body,
                      { color: colors.textPrimary },
                      isSelectedSize(size) && {
                        color: colors.buttonText,
                        fontWeight: "bold",
                      },
                    ]}
                  >
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Checkout Button */}
          <Button label="Checkout" size="lg" style={styles.checkoutBtn} />

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={[typography.h3, { color: colors.textPrimary }]}>
              Description
            </Text>
            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, marginTop: 8 },
              ]}
              numberOfLines={isDescriptionExpanded ? undefined : 3}
            >
              {PRODUCT_DETAILS.description}
              {isDescriptionExpanded && (
                <>
                  {"  "}
                  <Text
                    onPress={() =>
                      setIsDescriptionExpanded(!isDescriptionExpanded)
                    }
                    style={[typography.bodyBold, { color: colors.primary }]}
                  >
                    Show less
                  </Text>
                </>
              )}
            </Text>
            {!isDescriptionExpanded && (
              <TouchableOpacity
                onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                activeOpacity={0.7}
                style={{ marginTop: 2 }}
              >
                <Text style={[typography.bodyBold, { color: colors.primary }]}>
                  Show more
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Reviews Link */}
          <TouchableOpacity
            style={styles.reviewsLinkRow}
            onPress={() => router.push("/product/reviews")}
          >
            <Text style={[typography.h3, { color: colors.textPrimary }]}>
              Reviews ({PRODUCT_DETAILS.reviewCount})
            </Text>
            <IconSymbol
              name="chevron.right"
              size={20}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* --- Bottom Add To Cart --- */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.surface,
            paddingBottom: insets.bottom + 16,
            height: 84 + insets.bottom,
          },
        ]}
      >
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={[styles.qtyBtn, { backgroundColor: colors.border }]}
            onPress={() => setQuantity(Math.max(1, quantity - 1))}
          >
            <Minus size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text
            style={[
              typography.bodyBold,
              styles.qtyText,
              { color: colors.textPrimary },
            ]}
          >
            {quantity}
          </Text>
          <TouchableOpacity
            style={[
              styles.qtyBtnBlack,
              { backgroundColor: colors.textPrimary },
            ]}
            onPress={() => setQuantity(quantity + 1)}
          >
            <Plus size={20} color={colors.background} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.addToCartBtn, { backgroundColor: colors.textPrimary }]}
          activeOpacity={0.8}
          onPress={handleAddToCart}
        >
          <Text style={[typography.button, { color: colors.background }]}>
            Add to Cart
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  // Image Slider & Header Section
  imageSliderContainer: {
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    paddingBottom: 32,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    zIndex: 10,
  },
  headerIcon: { padding: 10 },

  imageWrapper: { alignItems: "center", marginVertical: 20 },
  mainImage: {
    width: width * 0.85,
    height: 320,
  },

  thumbnailList: { paddingHorizontal: 20 },
  thumbnail: { width: 70, height: 70 },

  detailsContainer: { padding: 20 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  row: { flexDirection: "row", alignItems: "center" },

  // Rating
  ratingContainer: { flexDirection: "row", alignItems: "center" },

  // Metadata
  metaDataContainer: { marginTop: 20, marginBottom: 28 },
  priceRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  saleTag: {
    backgroundColor: "#FFE24B",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 12,
  },
  saleTagText: { fontSize: 12, fontWeight: "800", color: "#000" },
  oldPrice: {
    fontSize: 16,
    textDecorationLine: "line-through",
    marginRight: 12,
  },
  stockRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  brandRow: { flexDirection: "row", alignItems: "center" },
  brandLogo: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },

  // AttributesCard
  attributesCard: { padding: 18, borderRadius: 20, marginBottom: 24 },
  variationPricing: { alignItems: "flex-start" },

  attributeSection: { marginBottom: 20 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 10 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    marginRight: 10,
    marginBottom: 10,
  },

  // Checkout btn
  checkoutBtn: {
    marginTop: 10,
    marginBottom: 28,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },

  // Description
  descriptionSection: { marginBottom: 20 },

  divider: { height: 1, marginVertical: 20 },

  reviewsLinkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },

  // Bottom Add to cart bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 15,
  },
  quantityContainer: { flexDirection: "row", alignItems: "center" },
  qtyBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyBtnBlack: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyText: { marginHorizontal: 20, fontSize: 18 },
  addToCartBtn: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    elevation: 2,
  },
});

/**
 * Converts a rem value to a scaled pixel value using react-native-size-matters.
 * 1rem is base 16px.
 * @param value The rem value to convert.
 * @returns The scaled pixel value.
 */
export const rem = (value: number): number => {
  return moderateScale(value * 16);
};
