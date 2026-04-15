import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useCartStore, CartItem as CartItemType } from '@/store/useCartStore';

interface CartItemProps {
  item: CartItemType;
}

export const CartItem: React.FC<CartItemProps> = ({ item }) => {
  const { colors, spacing } = useTheme();
  const { updateQuantity, removeFromCart } = useCartStore();
  const { product, quantity } = item;

  const handleIncrement = () => updateQuantity(product.id, quantity + 1);
  const handleDecrement = () => {
    if (quantity > 1) {
      updateQuantity(product.id, quantity - 1);
    } else {
      removeFromCart(product.id);
    }
  };

  return (
    <View style={[styles.container, { marginBottom: spacing.lg }]}>
      <View style={styles.row}>
        {/* Image */}
        <View style={[styles.imageContainer, { backgroundColor: colors.surface }]}>
          <Image source={product.image} style={styles.image} resizeMode="contain" />
        </View>

        {/* Details */}
        <View style={styles.details}>
          <Text type="small" style={{ color: colors.textSecondary }}>{product.vendor}</Text>
          <Text type="defaultSemiBold" numberOfLines={1}>{product.name}</Text>
          <Text type="small" style={{ color: colors.textSecondary, marginTop: 4 }}>
            Price: <Text type="small" style={{ color: colors.textPrimary, fontWeight: 'bold' }}>${product.price.toFixed(2)}</Text>
          </Text>
        </View>
      </View>

      {/* Quantity & Price */}
      <View style={styles.bottomRow}>
        <View style={[styles.quantityContainer, { backgroundColor: colors.surface, borderRadius: 12 }]}>
          <TouchableOpacity 
            style={styles.qtyBtn} 
            onPress={handleDecrement}
          >
            <Minus size={16} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text type="defaultSemiBold" style={styles.quantity}>{quantity}</Text>
          <TouchableOpacity 
            style={styles.qtyBtn} 
            onPress={handleIncrement}
          >
            <Plus size={16} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <Text type="subtitle" style={{ color: colors.textPrimary }}>
          ${(product.price * quantity).toFixed(2)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center' },
  imageContainer: { width: 70, height: 70, borderRadius: 12, padding: 8, justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: '100%' },
  details: { marginLeft: 15, flex: 1 },
  bottomRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 12,
    paddingLeft: 85 
  },
  quantityContainer: { flexDirection: 'row', alignItems: 'center', padding: 4 },
  qtyBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  quantity: { marginHorizontal: 12 },
});