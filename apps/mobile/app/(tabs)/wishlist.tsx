import { CartButton } from "@/components/ui/cart-button";
import { ProductCard } from "@/components/ui/product-card";
import { Text } from "@/components/ui/text";
import { View } from "@/components/ui/view";
import { EmptyWishlist } from "@/components/wishlist/EmptyWishlist";
import { PRODUCTS } from "@/constants/mock-data";
import { useTheme } from "@/hooks/use-theme";
import { useWishlistStore } from "@/store/useWishlistStore";
import { useLayoutStore } from "@/store/useLayoutStore";
import { useRouter } from "expo-router";
import { Dimensions, ScrollView, StyleSheet } from "react-native";

const { width } = Dimensions.get("window");

export default function WishlistScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const wishlistIds = useWishlistStore((state) => state.wishlistIds);
  const wishlistedProducts = PRODUCTS.filter((p) => wishlistIds.includes(p.id));
  const topInset = useLayoutStore((state) => state.topInset);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: topInset },
      ]}
    >
      <View variant="none" style={styles.header}>
        <View variant="none" style={{ paddingHorizontal: 24, paddingTop: 16 }}>
          <View variant="none" style={styles.headerTopRow}>
            <Text style={styles.title}>Wishlist</Text>
            <CartButton color={colors.textPrimary} />
          </View>
          <Text
            type="defaultSemiBold"
            style={[styles.subtitle, { color: colors.textSecondary }]}
          >
            Items you&apos;ve added to your favorites.
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {wishlistedProducts.length > 0 ? (
          <View variant="none" style={styles.grid}>
            {wishlistedProducts.map((product) => (
              <View key={product.id} variant="none" style={styles.gridItem}>
                <ProductCard product={product} />
              </View>
            ))}
          </View>
        ) : (
          <EmptyWishlist
            onAction={() => {
              // Navigate to Home or Store
              router.push("/");
            }}
          />
        )}
      </ScrollView>
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
  headerTopRow: {
    height: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontFamily: "NunitoSans_800ExtraBold",
    lineHeight: 34,
  },
  subtitle: {
    marginBottom: 16, // spacing.lg
    marginTop: -4,
    opacity: 0.8,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridItem: {
    width: (width - 48) / 2, // 2 column grid with padding
  },
});
