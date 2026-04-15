import React from 'react';
import { ScrollView } from 'react-native';
import { CartItem } from './CartItem';
import { CartItem as CartItemType } from '@/store/useCartStore';

interface CartItemsListProps {
  items: CartItemType[];
}

export const CartItemsList: React.FC<CartItemsListProps> = ({ items }) => {
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {items.map((item) => (
        <CartItem key={item.product.id} item={item} />
      ))}
    </ScrollView>
  );
};