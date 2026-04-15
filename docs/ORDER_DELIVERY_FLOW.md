# Order and Delivery Lifecycle Flow

## 1. Cart & Placement
1. Customer adds variants to Cart.
2. Order is generated capturing address and split into distinct `order_items` (CRITICAL: Each item represents one unit sold from a store to track effectively).
3. Payment represents the overarching order sequence.

## 2. Order Fulfillment (Vendor)
4. Vendor receives order webhook into their dashboard.
5. Vendor confirms inventory and marks `PREPARING`.
6. Vendor marks `READY_FOR_PICKUP`.

## 3. Delivery Operations
7. `delivery_assignment` record generated. Available drivers notified.
8. Driver accepts task (`ASSIGNED` -> `ACCEPTED`).
9. Driver physically collects item, scans/verifies, creating `pickup_events` & `pickup_event_items` to guarantee custody switch.
10. Driver proceeds to coordinate delivery. Status updates pushed to `delivery_tracking_updates` (e.g., `ON_THE_WAY`, `NEAR_CUSTOMER`).
11. Delivery finalized, updating root `order_item` status to `DELIVERED`, releasing vendor payout bounds.

## 4. Reverse Logistics
- Post-delivery: Window for disputes or returns exists via `disputes` ledger, halting commission automated disbursements.
