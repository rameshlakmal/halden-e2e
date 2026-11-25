import { expect, test } from '../../fixtures/fixtures.ts';
import { PRODUCTS, SEEDED_ORDERS } from '../../utils/shop-data.ts';

test.describe('Admin', { session: 'admin', tags: ['admin'] }, () => {
  test(
    'Verify that changing a price leaves past orders at the price they were sold for',
    { tags: ['smoke', 'bug:price_edit_rewrites_orders', 'P0', 'flow:ADM-F01'] },
    async ({ adminPage, orderPage }) => {
      const { stove } = PRODUCTS;
      await adminPage.openProducts();
      await adminPage.setPrice(stove, stove.price + 1000);
      await adminPage.expectNotice('Price saved.');
      await adminPage.openOrder(SEEDED_ORDERS.mayaTentAndStove);
      await orderPage.expectLine(stove, 1, stove.price);
    },
  );

  test('Verify that the QA lab switches a planted bug on and off', { tags: ['P2', 'flow:ADM-F05'] }, async ({ adminPage, shop }) => {
    test.skip(shop.bugs.length > 0, 'This run switched planted bugs on; the QA lab test expects a healthy shop.');
    const title = 'Coupon applied twice';
    await adminPage.openQaLab();
    await adminPage.expectBugsOn(0);
    await adminPage.switchBug(title, true);
    await adminPage.expectNotice('Bug switched on.');
    await adminPage.expectBugsOn(1);
    expect(await shop.enabledBugs()).toEqual(['coupon_twice']);
    await adminPage.switchBug(title, false);
    await adminPage.expectNotice('Bug switched off.');
    expect(await shop.enabledBugs()).toEqual([]);
  });
});
