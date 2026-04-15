# Database Specification

## Approach
Using PostgreSQL (Supabase compatible) managed via Prisma ORM for robust type-safety and migrations.

## Core Models

### 1. User & Authentication
- `users`: Core authentication identity mapping to Supabase Auth.
- `user_profiles`: Extends user data with application-specific fields (name, phone, avatar).
- `addresses`: Multi-address ledger for users (shipping, billing).
- `roles`, `permissions`, `user_role_assignments`: Granular RBAC configurations.

### 2. Store & Vendor Identity
- `stores`: The core entity of a merchant.
- `store_profiles`: Branding, logos, description.
- `store_applications`, `store_application_status_history`: Audit trail for merchant onboarding.
- `store_operating_hours`: Delivery windows and operational configurations.

### 3. Product Catalog
- `products`: Base catalog items owned by `stores`.
- `product_variants`: Size/color permutations, linking to specific inventory lines.
- `product_categories`: Categorization taxonomy.

### 4. Ordering & Fulfillment
- `carts`, `cart_items`: Pre-checkout volatile data.
- `orders`: High-level intent encompassing a multi-store purchase checkout.
- `order_items`: CRITICAL. Traces individual item purchases mapped to a specific product variant, snapshotting the price, title, attributes, and calculating line-item commissions.
- `order_status_history`, `order_item_status_history`: Temporal tables logging every status change.

### 5. Delivery Operations
- `delivery_assignments`: Encapsulating picking up items and delivering them.
- `pickup_events`, `delivery_proofs`: Audit trails with imagery linking driver action to order_item resolution.
