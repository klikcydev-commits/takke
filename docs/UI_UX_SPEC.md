# UI/UX Design System Specification

## 1. Visual Direction
- **Vibe**: Premium minimal fashion marketplace. Soft luxury look with an elegant neutral color palette.
- **Colors**: Creamy beige, off-white, sand, and black accents (no loud primary colors).
- **Surface Geometry**: Soft rounded rectangles, large cards, and bottom action bars heavily utilizing `borderRadius` abstractions.
- **Typography**: "Nunito Sans" or modern Google Equivalents. Clean thin typography and refined search/category chips.

## 2. Reusable Component Packages (`packages/ui`)
All design must derive from these reusable atomic abstractions:

- `Button`: Primary (Black/Dark), Secondary (Soft Sand/Outline), Ghost formats.
- `CategoryChip`: Horizontal scrollable pills with muted background unselected, high contrast selected.
- `ProductCard`: Edge-to-edge images, soft shadow overlays, stark black/white cart overlay button.
- `StatusBadge`: Clean status representations (Green for delivered, minimal backgrounds).
- `FormElements`: Understated inputs with minimal borders and subtle focus rings.

## 3. Screens Requirement
- **Mobile Home**: Top header search, horizontal rounded chips, grid aesthetic product views.
- **Product Details Page**: Heavy imagery, soft rounded detail sections, size selection chips array.
- **Administrative/Vendor**: Dashboard stats styling matching mobile premium vibe but utilizing extensive DataTables.
