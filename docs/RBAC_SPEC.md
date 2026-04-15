# Role-Based Access Control (RBAC) Specification

## Roles

1. **CUSTOMER**: Default state after signup.
   - Read products, place orders.
   - Manage personal profile and lists.

2. **VENDOR**: Upgraded customer or direct merchant applicant (once approved).
   - Create catalog entries, attach products to store.
   - Fulfill orders and process payouts.
   - Access Vendor Web Dashboard exclusively.

3. **DELIVERY_DRIVER**: Fulfillment agent.
   - Read open delivery assignments in designated locale.
   - Write delivery trajectory statuses and pickup confirmations.

4. **ADMIN**: Platform operational moderatory.
   - Review merchant applications, settle basic disputes.
   - Moderate product validity.

5. **SUPER_ADMIN**: Owner of the marketplace.
   - Manages Admins, modifies platform configurations, full systemic visibility.
   - Controls payout execution manually if requested.

## Enforcement
Roles are affixed directly to user identity or dynamically verified via JWT claims embedded natively in custom edge authorization sequences.
