// Every spec imports `test` and `expect` from here, never from 'e2e' or '@e2e-dev/web' directly.
import { test as base } from '@e2e-dev/web';
import { AccountPage } from '../pages/account.page.ts';
import { AdminPage } from '../pages/admin.page.ts';
import { CartPage } from '../pages/cart.page.ts';
import { CheckoutPage } from '../pages/checkout.page.ts';
import { OrderPage } from '../pages/order.page.ts';
import { ProductPage } from '../pages/product.page.ts';
import { ShopperFlow } from '../pages/shopper.flow.ts';
import { env, type BugKey } from '../utils/env.ts';
import * as shopDb from '../utils/shop-db.ts';

export { expect } from 'e2e';

/** The shop under test, from underneath: its database, its planted bugs and its business rules. */
export interface Shop {
  /** The planted bugs this run switched on (HALDEN_BUGS). */
  readonly bugs: readonly BugKey[];
  setBugs(keys: readonly BugKey[]): Promise<void>;
  enabledBugs(): Promise<string[]>;
  checkRules(): Promise<shopDb.BrokenRule[]>;
  stockOf(slug: string): Promise<number>;
  order(id: string): Promise<shopDb.OrderRecord | null>;
  latestOrderId(): Promise<string>;
}

function describeBroken(broken: shopDb.BrokenRule[]): string {
  return broken.map((b) => `  - ${b.rule}: ${JSON.stringify(b.rows[0])}${b.rows.length > 1 ? ` (+${b.rows.length - 1} more)` : ''}`).join('\n');
}

const withShop = base.extend<{ shop: Shop }>({
  // Each attempt starts from a freshly seeded shop with this run's planted bugs switched on.
  shop: async (_fixtures, use) => {
    if (!env.keepShop) {
      await shopDb.resetShop();
      await shopDb.setBugs(env.bugs);
    }
    await use({
      bugs: env.bugs,
      setBugs: shopDb.setBugs,
      enabledBugs: shopDb.enabledBugs,
      checkRules: shopDb.checkRules,
      stockOf: shopDb.stockOf,
      order: shopDb.orderRecord,
      latestOrderId: shopDb.latestOrderId,
    });
    // HALDEN_DB_RULES=1: the database is a second oracle. A broken business rule fails the test,
    // even when every assertion on screen passed.
    if (env.dbRules) {
      const broken = await shopDb.checkRules();
      if (broken.length > 0) throw new Error(`Business rules broken after this test:\n${describeBroken(broken)}`);
    }
  },
});

const withPages = withShop.extend<{
  productPage: ProductPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  orderPage: OrderPage;
  accountPage: AccountPage;
  adminPage: AdminPage;
}>({
  productPage: async ({ app, screen }, use) => use(new ProductPage(app, screen)),
  cartPage: async ({ app, screen }, use) => use(new CartPage(app, screen)),
  checkoutPage: async ({ app, screen }, use) => use(new CheckoutPage(app, screen)),
  orderPage: async ({ app, screen }, use) => use(new OrderPage(app, screen)),
  accountPage: async ({ app, screen }, use) => use(new AccountPage(app, screen)),
  adminPage: async ({ app, screen }, use) => use(new AdminPage(app, screen)),
});

export const test = withPages.extend<{ shopper: ShopperFlow }>({
  shopper: async ({ productPage, cartPage, checkoutPage, orderPage }, use) =>
    use(new ShopperFlow(productPage, cartPage, checkoutPage, orderPage)),
});
