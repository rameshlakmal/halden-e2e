import { expect, test } from '../../fixtures/fixtures.ts';
import { ADDRESS, CARDS, COUPONS, expectedTotals, PRODUCTS } from '../../utils/shop-data.ts';

test.describe('Checkout', { session: 'shopper', tags: ['checkout', 'shopper'] }, () => {
  test(
    'Verify that a small order is charged its full total, shipping included',
    { tags: ['smoke', 'bug:payment_misses_shipping', 'P0', 'flow:CHK-F01', 'flow:ORD-F03'] },
    async ({ shopper, orderPage, accountPage }) => {
      const lines = [{ product: PRODUCTS.pillow }];
      const expected = expectedTotals(lines);
      const id = await shopper.buy(lines);
      await orderPage.expectStatus('Paid');
      await orderPage.expectTotals(expected);
      await orderPage.expectCharged(expected.total);
      await accountPage.open();
      await accountPage.expectOrderListed(id, expected.total, 'Paid');
    },
  );

  test(
    'Verify that a coupon order keeps the discount it was priced with',
    { tags: ['bug:coupon_twice', 'P0', 'flow:CPN-F09'] },
    async ({ shopper, orderPage }) => {
      const lines = [{ product: PRODUCTS.stove }, { product: PRODUCTS.filter }];
      const expected = expectedTotals(lines, COUPONS.welcome10);
      await shopper.buy(lines, { coupon: COUPONS.welcome10.code });
      await orderPage.expectTotals(expected, COUPONS.welcome10.code);
      await orderPage.expectCharged(expected.total);
    },
  );

  test('Verify that a declined card places no order', { tags: ['P0', 'flow:CHK-F02'] }, async ({ productPage, checkoutPage, shop }) => {
    const before = await shop.latestOrderId();
    await productPage.addProducts([{ product: PRODUCTS.pillow }]);
    await checkoutPage.open();
    await checkoutPage.fillShipping();
    await checkoutPage.pay(CARDS.declined);
    await checkoutPage.expectError('Your card was declined. Try another card.');
    expect(await shop.latestOrderId()).toBe(before);
  });

  // The same purchase with the agent at the wheel: it finds the product and fills the form, the test still
  // pins every amount exactly. On later runs the replay cache repeats the verified steps without a model call.
  test(
    'Verify that a shopper can buy a stove with agent-driven steps and exact checks',
    { tags: ['agent', 'P1', 'flow:CHK-F01'] },
    async ({ app, agent, screen, checkoutPage, orderPage }) => {
      const expected = expectedTotals([{ product: PRODUCTS.stove }]);
      await app.open('/');
      await agent.act('find the {product} in the shop and add one to the cart', { params: { product: PRODUCTS.stove.name } });
      await expect(screen.getByRole('status').filter({ hasText: 'Added to your cart.' })).toBeVisible();
      await agent.act('open the cart and go to checkout');
      await checkoutPage.expectOnCheckout();
      await checkoutPage.expectPayAmount(expected.total);
      await agent.act('fill in the shipping address: {line1}, {city}, postcode {postcode}, {country}', {
        params: { line1: ADDRESS.line1, city: ADDRESS.city, postcode: ADDRESS.postcode, country: ADDRESS.country },
      });
      await expect(screen.getByLabel('Postcode')).toHaveValue(ADDRESS.postcode);
      await checkoutPage.pay(CARDS.pays);
      await orderPage.expectPlaced();
      await orderPage.expectCharged(expected.total);
      await agent.assert('the order page shows the Ember Stove and the order is paid');
    },
  );
});
