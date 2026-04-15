# Master Architecture Specification

## 1. Project Overview
A multi-vendor e-commerce marketplace platform built for scale. Features full traceability of the product lifecycle, customizable user roles, delivery operations, and premium mobile-first UI.

## 2. Technology Stack
- **Mobile Application**: React Native (Expo Go compatible in development) + TypeScript
- **Web Dashboards (Admin/Vendor)**: Next.js + TailwindCSS + Radix UI
- **Backend / APIs**: Next.js route handlers + **`@marketplace/marketplace-server`** (Prisma)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Auth & Edge functions**: Supabase
- **Monorepo Management**: pnpm

## 3. Project Structure
- `apps/mobile`: Customer-facing mobile app.
- `apps/admin-web`: Super Admin monitoring and management portal.
- `apps/vendor-web`: Partner portal for creating stores, managing products, and tracking orders.
- `packages/marketplace-server`: Prisma data layer shared by Next `/api` routes.
- `packages/*`: Other shared utilities, types, and UI components.

## 4. Phased Execution Approach
- **Phase 1**: Monorepo layout, baseline documentation, Prisma schema initialization.
- **Phase 2**: Next.js route handlers + Prisma (`@marketplace/marketplace-server`), Supabase Auth, RBAC.
- **Phase 3**: Customer mobile app UX (Onboarding, Shop, Cart, Profile).
- **Phase 4**: Vendor Web Dashboard.
- **Phase 5**: Driver assignment functionality.
- **Phase 6**: Admin Panel implementation for super admins.
- **Phase 7**: Quality assurance, notifications, reporting, and deployment readiness.
