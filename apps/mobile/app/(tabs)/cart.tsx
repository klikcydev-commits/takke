import { Text } from "@/components/ui/text";
import { View } from "@/components/ui/view";
import { useTheme } from "@/hooks/use-theme";
import { useCartStore } from "@/store/useCartStore";
import { useLayoutStore } from "@/store/useLayoutStore";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { CartItemsList } from "@/components/cart/CartItemsList";
import { EmptyCart } from "@/components/cart/EmptyCart";

export default function CartScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  
  const items = useCartStore((state) => state.items);
  const getCartTotal = useCartStore((state) => state.getCartTotal);
  
  const topInset = useLayoutStore((state) => state.topInset);
  const bottomInset = useLayoutStore((state) => state.bottomInset);

  const cartTotal = getCartTotal();

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
            <Text style={styles.title}>Cart</Text>
            {/* Keeping it consistent with other headers, though we don't necessarily need a cart button in the cart screen itself. We can show an Empty/Clear button instead or just leave it empty. */}
          </View>
          <Text
            type="defaultSemiBold"
            style={[styles.subtitle, { color: colors.textSecondary }]}
          >
            Review your selected items.
          </Text>
        </View>
      </View>

      <View style={styles.contentContainer} variant="none">
        {items.length > 0 ? (
          <>
            <View style={styles.listContainer} variant="none">
              <CartItemsList items={items} />
            </View>
            <View 
              variant="none" 
              style={[
                styles.checkoutContainer, 
                { 
                  backgroundColor: colors.surface,
                  borderTopColor: colors.border,
                  paddingBottom: bottomInset + 80 // Add bottom navigation bar padding
                }
              ]}
            >
              <View variant="none" style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>${cartTotal.toFixed(2)}</Text>
              </View>
              
              <TouchableOpacity 
                style={[styles.checkoutButton, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
                onPress={() => {
                  // Checkout Flow
                  // We will implement placeholder or navigate to a dedicated checkout modal
                }}
              >
                <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                <IconSymbol name="chevron.right" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <EmptyCart
            onAction={() => {
              router.push("/");
            }}
          />
        )}
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
    marginBottom: 16,
    marginTop: -4,
    opacity: 0.8,
  },
  contentContainer: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  checkoutContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 18,
    fontFamily: "NunitoSans_600SemiBold",
    opacity: 0.7,
  },
  totalValue: {
    fontSize: 24,
    fontFamily: "NunitoSans_800ExtraBold",
  },
  checkoutButton: {
    flexDirection: "row",
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  checkoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "NunitoSans_700Bold",
    marginRight: 8,
  },
});
