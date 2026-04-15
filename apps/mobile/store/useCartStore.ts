import { create } from 'zustand';
import { cartApi } from '@/services/mockApi';
import { Product } from '@/components/ui/product-card';
import { toast } from 'sonner-native';

export interface CartItem {
    product: Product;
    quantity: number;
}

interface CartState {
    items: CartItem[];
    addToCart: (product: Product, quantity?: number) => Promise<void>;
    removeFromCart: (productId: string) => Promise<void>;
    updateQuantity: (productId: string, quantity: number) => Promise<void>;
    clearCart: () => void;
    // Computed (these can be regular functions that read state)
    getCartTotal: () => number;
    getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
    items: [],

    addToCart: async (product: Product, quantity = 1) => {
        const previousItems = get().items;
        const existingItem = previousItems.find(item => item.product.id === product.id);

        let newItems;
        if (existingItem) {
            newItems = previousItems.map(item =>
                item.product.id === product.id
                    ? { ...item, quantity: item.quantity + quantity }
                    : item
            );
        } else {
            newItems = [...previousItems, { product, quantity }];
        }

        // Optimistic Update
        set({ items: newItems });
        toast.success(`Added ${product.name} to cart`);

        // API Call
        try {
            if (existingItem) {
                await cartApi.updateQuantity(product.id, existingItem.quantity + quantity);
            } else {
                await cartApi.add(product.id, quantity);
            }
        } catch (error) {
            console.warn('Cart update failed, rolling back:', error);
            set({ items: previousItems });
            toast.error('Failed to add to cart', { description: 'Reverted back to previous state. Please try again.' });
        }
    },

    removeFromCart: async (productId: string) => {
        const previousItems = get().items;
        const newItems = previousItems.filter(item => item.product.id !== productId);

        set({ items: newItems });

        try {
            await cartApi.remove(productId);
        } catch (error) {
            console.warn('Cart remove failed, rolling back:', error);
            set({ items: previousItems });
            toast.error('Failed to remove from cart', { description: 'Please try again.' });
        }
    },

    updateQuantity: async (productId: string, quantity: number) => {
        if (quantity <= 0) {
            return get().removeFromCart(productId);
        }

        const previousItems = get().items;
        const newItems = previousItems.map(item =>
            item.product.id === productId ? { ...item, quantity } : item
        );

        set({ items: newItems });

        try {
            await cartApi.updateQuantity(productId, quantity);
        } catch (error) {
            console.warn('Cart update quantity failed, rolling back:', error);
            set({ items: previousItems });
            toast.error('Failed to update quantity', { description: 'Please try again.' });
        }
    },

    clearCart: () => {
        set({ items: [] });
    },

    getCartTotal: () => {
        return get().items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
    },

    getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
    }
}));
