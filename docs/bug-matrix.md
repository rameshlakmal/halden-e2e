# Bug detection matrix

Generated 2026-10-08 by `npm run bug-matrix`. Each row switches on one planted bug in the shop's QA lab and runs the suite against a freshly seeded database. Deterministic tests only (agent tests excluded, so no model calls).

| Scenario | Screen assertions | Screen + database rules |
| --- | --- | --- |
| **Healthy shop** | ✅ all green | ✅ all green |
| `coupon_twice` | ✅ caught by 2 | ✅ caught by 2 |
| `cancel_keeps_stock` | ✅ caught by 1 | ✅ caught by 2 |
| `payment_misses_shipping` | ✅ caught by 2 | ✅ caught by 3 |
| `price_edit_rewrites_orders` | ✅ caught by 1 | ✅ caught by 1 |
| `coupon_limit_ignored` | ✅ caught by 1 | ✅ caught by 1 |

## Which tests caught each bug

### `coupon_twice`

**Screen assertions** (98s):
- Verify that WELCOME10 takes 10% off a cart of several products, once *(its guard test)*
- Verify that a coupon order keeps the discount it was priced with *(its guard test)*

**Screen + database rules** (88s):
- Verify that WELCOME10 takes 10% off a cart of several products, once *(its guard test)*
- Verify that a coupon order keeps the discount it was priced with *(its guard test)*

### `cancel_keeps_stock`

**Screen assertions** (76s):
- Verify that cancelling an order puts its items back in stock *(its guard test)*

**Screen + database rules** (88s):
- Verify that cancelling a paid order refunds it in full
- Verify that cancelling an order puts its items back in stock *(its guard test)*

### `payment_misses_shipping`

**Screen assertions** (83s):
- Verify that a small order is charged its full total, shipping included *(its guard test)*
- Verify that cancelling a paid order refunds it in full

**Screen + database rules** (88s):
- Verify that a small order is charged its full total, shipping included *(its guard test)*
- Verify that cancelling a paid order refunds it in full
- Verify that cancelling an order puts its items back in stock

### `price_edit_rewrites_orders`

**Screen assertions** (79s):
- Verify that changing a price leaves past orders at the price they were sold for *(its guard test)*

**Screen + database rules** (79s):
- Verify that changing a price leaves past orders at the price they were sold for *(its guard test)*

### `coupon_limit_ignored`

**Screen assertions** (82s):
- Verify that a used up code (TRAILHEAD15) is refused *(its guard test)*

**Screen + database rules** (78s):
- Verify that a used up code (TRAILHEAD15) is refused *(its guard test)*

