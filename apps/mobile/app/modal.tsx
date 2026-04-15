import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/hooks/use-theme";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CartItemsList } from "@/components/cart/CartItemsList";
import { EmptyCart } from "@/components/cart/EmptyCart";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useCartStore } from "@/store/useCartStore";

export default function ModalScreen() {
  const { colors, spacing } = useTheme();
  const cartItems = useCartStore((state) => state.items);
  const cartTotal = useCartStore((state) => state.getCartTotal());
  const router = useRouter();

  const isEmpty = cartItems.length === 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: colors.border, backgroundColor: colors.surface },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <IconSymbol
            name="chevron.left"
            size={24}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
        <Text type="subtitle" style={{ fontFamily: "NunitoSans_800ExtraBold" }}>
          Cart
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Body */}
      <View style={styles.body}>
        {isEmpty ? (
          <EmptyCart onAction={() => router.back()} />
        ) : (
          <CartItemsList items={cartItems} />
        )}
      </View>

      {/* Footer / Checkout */}
      {!isEmpty && (
        <View
          style={[
            styles.footer,
            { borderTopColor: colors.border, paddingBottom: spacing.lg },
          ]}
        >
          <View style={styles.totalRow}>
            <Text
              type="defaultSemiBold"
              style={{ color: colors.textSecondary }}
            >
              Total Amount
            </Text>
            <Text type="title">${cartTotal.toFixed(2)}</Text>
          </View>
          <Button
            label={`Checkout $${cartTotal.toFixed(2)}`}
            onPress={() => console.log("Checkout Pressed")}
            variant="primary"
            size="lg"
            style={styles.checkoutButton}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  checkoutButton: {
    width: "100%",
    borderRadius: 16,
  },
});
