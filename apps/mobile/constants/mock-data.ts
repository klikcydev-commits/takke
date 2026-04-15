/**
 * @file mock-data.ts
 * Temporary dummy content for the marketplace UI.
 * This should be replaced with actual back-end data during integration.
 */

export const BANNERS = [
  require("@/assets/images/banners/promo-banner-1.png"),
  require("@/assets/images/banners/promo-banner-2.png"),
  require("@/assets/images/banners/promo-banner-3.png"),
];

export const CATEGORIES = [
  { id: "1", name: "Sale", icon: "sale" },
  { id: "2", name: "Trending", icon: "trending" },
  { id: "3", name: "New", icon: "new" },
  { id: "4", name: "Men", icon: "suit" },
  { id: "5", name: "Women", icon: "dress" },
  { id: "6", name: "Kids", icon: "kid" },
  { id: "7", name: "Shoes", icon: "shoes" },
  { id: "8", name: "Accessories", icon: "accessories" },
];

export const PRODUCTS = [
  {
    id: "1",
    name: "Adidas Sport T-Shirt",
    vendor: "Adidas Official",
    price: 45.0,
    image: require("@/assets/images/products/product.png"),
    onSale: true,
    discount: "20% OFF",
  },
  {
    id: "2",
    name: "Classic Tracksuit Jacket",
    vendor: "Adidas Official",
    price: 85.0,
    image: require("@/assets/images/products/product.png"),
    onSale: false,
  },
  {
    id: "3",
    name: "Premium Leather Bag",
    vendor: "Luxury Boutique",
    price: 120.0,
    image: require("@/assets/images/products/product.png"),
    onSale: true,
    discount: "SALE",
  },
  {
    id: "4",
    name: "Cotton Summer Dress",
    vendor: "Fashion Hub",
    price: 65.0,
    image: require("@/assets/images/products/product.png"), // Reusing for dummy
    onSale: false,
  },
];

export const STORES = [
  {
    id: "1",
    name: "Adidas Official",
    logo: require("@/assets/images/favicon.png"),
    products: [PRODUCTS[0], PRODUCTS[1], PRODUCTS[0]],
  },
  {
    id: "2",
    name: "Luxury Boutique",
    logo: require("@/assets/images/favicon.png"),
    products: [PRODUCTS[2], PRODUCTS[3], PRODUCTS[2]],
  },
  {
    id: "3",
    name: "Fashion Hub",
    logo: require("@/assets/images/favicon.png"),
    products: [PRODUCTS[3], PRODUCTS[0], PRODUCTS[3]],
  },
];

export const STORE_TABS = [
  "Men's Clothing",
  "Women's Clothing",
  "Children's",
  "Footwear",
  "Accessories",
  "Sports",
];

export const BRANDS = [
  { id: "1", name: "Nike", icon: require("@/assets/images/brands/nike.svg") },
  {
    id: "2",
    name: "Adidas",
    icon: require("@/assets/images/brands/adidas.svg"),
  },
  { id: "3", name: "Puma", icon: require("@/assets/images/brands/puma.svg") },
  { id: "4", name: "Chanel" },
  { id: "5", name: "Gucci", icon: require("@/assets/images/brands/gucci.svg") },
  { id: "6", name: "Zara", icon: require("@/assets/images/brands/zara.svg") },
  { id: "7", name: "H&M", icon: require("@/assets/images/brands/handm.svg") },
  { id: "8", name: "Prada", icon: require("@/assets/images/brands/prada.svg") },
];

export const PRODUCT_DETAILS = {
  id: "1",
  name: "Vintage T-Shirt",
  originalPrice: 25.0,
  salePrice: 17.5,
  rating: 4.7,
  reviewCount: 162,
  status: "In Stock",
  brand: {
    name: "Vintage Apparel",
    logo: "https://images.unsplash.com/photo-1560243563-062bfc001d68?q=80&w=200&auto=format&fit=crop",
  },
  shortDescription:
    "Experience ultimate comfort and timeless style with this classic vintage t-shirt, expertly crafted for a perfect fit and durability.",
  description:
    "This premium t-shirt is designed for both comfort and style, constructed with high-quality materials that ensure everyday durability. Its breathable fabric provides a soft touch against the skin, making it an excellent choice for any casual occasion.",
  images: [
    require("@/assets/images/products/product.png"),
    require("@/assets/images/products/product.png"),
    require("@/assets/images/products/product.png"),
    require("@/assets/images/products/product.png"),
    require("@/assets/images/products/product.png"),
    require("@/assets/images/products/product.png"),
  ],
  colors: ["Blue", "Green", "Red"],
  sizes: ["S", "M", "L", "XL"],
};

export const REVIEWS_DATA = {
  overallRating: 4.8,
  totalReviews: 12611,
  ratingDistribution: [
    { score: "5", percentage: 1.0 },
    { score: "4", percentage: 0.8 },
    { score: "3", percentage: 0.6 },
    { score: "2", percentage: 0.4 },
    { score: "1", percentage: 0.2 },
  ],
  reviews: [
    {
      id: "1",
      user: {
        name: "Jane Doe",
        avatar:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop",
      },
      rating: 4,
      date: "30 Jan, 2024",
      content:
        "I recently purchased this product, and I must say, it exceeded my expectations! The quality is outstanding, and it's evident that the manufacturers paid attention to every detail. The sleek design not only looks great but also enhances the overall user experience.",
      storeReply: {
        storeName: "Vintage Apparel",
        date: "01 Feb, 2024",
        content:
          "Thank you so much for taking the time to share your positive experience with our product! We're thrilled to hear that it exceeded your expectations and that you appreciate the attention to detail in its design.",
      },
    },
    {
      id: "2",
      user: {
        name: "John Smith",
        avatar:
          "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150&auto=format&fit=crop",
      },
      rating: 5,
      date: "28 Jan, 2024",
      content:
        "Absolutely love it! The fit is perfect and the material feels very premium. I've washed it several times and it still looks brand new. Will definitely buy more in other colors. The packaging was also very nice.",
    },
    {
      id: "3",
      user: {
        name: "Emily Chen",
        avatar:
          "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&auto=format&fit=crop",
      },
      rating: 4,
      date: "25 Jan, 2024",
      content:
        "Good product overall. The color is slightly different from the pictures, but still very nice. Delivery was fast and packaging was secure. The fabric is comfortable for daily wear. Would recommend.",
    },
  ],
};
