import { Button } from "@/components/ui/button";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";
import React from "react";
import { StyleSheet, View } from "react-native";

interface EmptyCartProps {
  onAction: () => void;
}

export const EmptyCart: React.FC<EmptyCartProps> = ({ onAction }) => {
  const { colors, spacing } = useTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <IconSymbol name="inbox" size={48} color={colors.textSecondary} />
      </View>
      <Text
        style={[
          styles.title,
          { color: colors.textPrimary, marginBottom: spacing.sm },
        ]}
      >
        Your cart is empty
      </Text>
      <Text
        style={[
          styles.subtitle,
          { color: colors.textSecondary, marginBottom: spacing.xl },
        ]}
      >
        No items added yet.
      </Text>
      <Button
        label="Let's fill it"
        onPress={onAction}
        variant="primary"
        style={{ paddingHorizontal: 40 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 60,
    paddingHorizontal: 24,
    marginTop: -120, // Shift Up more to match wishlist
    marginLeft: -16, // Shift Left to match wishlist padding
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: "NunitoSans_700Bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "NunitoSans_400Regular",
    textAlign: "center",
    lineHeight: 24,
  },
});
