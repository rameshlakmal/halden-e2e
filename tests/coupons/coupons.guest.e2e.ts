import { test } from '../../fixtures/fixtures.ts';
import { COUPONS, expectedTotals, PRODUCTS, REFUSED_COUPONS } from '../../utils/shop-data.ts';

test.describe('Coupons', { tags: ['coupons', 'guest'] }, () => {
  // Every refused code is tried on a basket over $100: TRAILHEAD15's minimum must not be the reason it fails.
  const basket = [{ product: PRODUCTS.daypack }];
  const REFUSED_FLOWS: Record<string, string> = { SPRING5: 'CPN-F05', STAFF50: 'CPN-F06', NOPE99: 'CPN-F07' };

  for (const coupon of REFUSED_COUPONS) {
    const tags = coupon.code === 'TRAILHEAD15' ? ['bug:coupon_limit_ignored', 'P0', 'flow:CPN-F04'] : ['P1', `flow:${REFUSED_FLOWS[coupon.code]}`];
    test(`Verify that a ${coupon.why} code (${coupon.code}) is refused`, { tags }, async ({ productPage, cartPage }) => {
      await productPage.addProducts(basket);
      await cartPage.open();
      await cartPage.applyCoupon(coupon.code);
      await cartPage.expectCouponRefused(coupon.message);
      await cartPage.expectTotals(expectedTotals(basket));
    });
  }

  test('Verify that SAVE20 is refused below its $150 minimum', { tags: ['P1', 'flow:CPN-F03'] }, async ({ productPage, cartPage }) => {
    await productPage.addProducts(basket);
    await cartPage.open();
    await cartPage.applyCoupon(COUPONS.save20.code);
    await cartPage.expectCouponRefused('This code needs an order of at least 150.00.');
  });

  test('Verify that SAVE20 takes $20 off an order over $150', { tags: ['P0', 'flow:CPN-F02'] }, async ({ productPage, cartPage }) => {
    const lines = [{ product: PRODUCTS.tent }];
    await productPage.addProducts(lines);
    await cartPage.open();
    await cartPage.applyCoupon(COUPONS.save20.code);
    await cartPage.expectCouponApplied(COUPONS.save20.code);
    await cartPage.expectTotals(expectedTotals(lines, COUPONS.save20), COUPONS.save20.code);
  });
});
