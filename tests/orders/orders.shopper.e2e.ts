import { test } from '../../fixtures/fixtures.ts';
import { expectedTotals, PRODUCTS } from '../../utils/shop-data.ts';

test.describe('Cancelling an order', { session: 'shopper', tags: ['orders', 'shopper'] }, () => {
  test('Verify that cancelling a paid order refunds it in full', { tags: ['smoke', 'P0', 'flow:ORD-F01'] }, async ({ shopper, orderPage }) => {
    const lines = [{ product: PRODUCTS.pillow }];
    await shopper.buy(lines);
    await orderPage.cancel();
    await orderPage.expectCancelledAndRefunded();
    await orderPage.expectRefunded(expectedTotals(lines).total);
  });

  test(
    'Verify that cancelling an order puts its items back in stock',
    { tags: ['bug:cancel_keeps_stock', 'P0', 'flow:ORD-F02'] },
    async ({ shopper, productPage, orderPage }) => {
      const { hammock } = PRODUCTS;
      const id = await shopper.buy([{ product: hammock }]);
      await productPage.open(hammock);
      await productPage.expectStockNote(`Only ${hammock.stock - 1} left`);
      await orderPage.open(id);
      await orderPage.cancel();
      await orderPage.expectCancelledAndRefunded();
      await productPage.open(hammock);
      await productPage.expectStockNote(`Only ${hammock.stock} left`);
    },
  );
});
