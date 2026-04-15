import { create } from 'zustand';
import { wishlistApi } from '@/services/mockApi';
import { toast } from 'sonner-native';

interface WishlistState {
    wishlistIds: string[];
    toggleWishlist: (productId: string) => Promise<void>;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
    wishlistIds: [],

    toggleWishlist: async (productId: string) => {
        const previousIds = get().wishlistIds;
        const isCurrentlyWishlisted = previousIds.includes(productId);

        // 1. Optimistic Update
        const newIds = isCurrentlyWishlisted
            ? previousIds.filter(id => id !== productId)
            : [...previousIds, productId];

        set({ wishlistIds: newIds });

        // 2. Call API
        try {
            if (isCurrentlyWishlisted) {
                await wishlistApi.remove(productId);
                toast.success('Removed from wishlist');
            } else {
                await wishlistApi.add(productId);
                toast.success('Added to wishlist');
            }
        } catch (error) {
            // 3. Rollback on Error
            console.warn('Wishlist update failed, rolling back:', error);
            set({ wishlistIds: previousIds });
            toast.error(
                `Failed to ${isCurrentlyWishlisted ? 'remove from' : 'add to'} wishlist.`,
                { description: 'Please check your connection and try again.' }
            );
        }
    }
}));
