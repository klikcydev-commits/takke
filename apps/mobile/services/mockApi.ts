/**
 * Mock API Service
 * 
 * Simulates latency and occasional errors for testing optimistic updates.
 */

// Utility to simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper: 10% chance to throw an error for testing rollbacks
// Set to true or higher percentage if you want to test the error state frequently.
const simulateNetworkError = () => {
    const shouldError = Math.random() < 0.1;
    if (shouldError) {
        throw new Error('Network error simulated. API call failed.');
    }
};

export const wishlistApi = {
    add: async (productId: string) => {
        await delay(500); // 500ms latency
        simulateNetworkError();
        console.log(`[API] Added ${productId} to wishlist`);
        return true;
    },
    remove: async (productId: string) => {
        await delay(400);
        simulateNetworkError();
        console.log(`[API] Removed ${productId} from wishlist`);
        return true;
    }
};

export const cartApi = {
    add: async (productId: string, quantity: number = 1) => {
        await delay(600);
        simulateNetworkError();
        console.log(`[API] Added ${quantity} of ${productId} to cart`);
        return true;
    },
    remove: async (productId: string) => {
        await delay(500);
        simulateNetworkError();
        console.log(`[API] Removed ${productId} from cart`);
        return true;
    },
    updateQuantity: async (productId: string, quantity: number) => {
        await delay(300);
        simulateNetworkError();
        console.log(`[API] Updated quantity of ${productId} to ${quantity}`);
        return true;
    }
};
