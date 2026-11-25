import { test } from '../../fixtures/fixtures.ts';
import { COUPONS, expectedTotals, PRODUCTS } from '../../utils/shop-data.ts';

test.describe('Cart totals', { tags: ['cart', 'guest'] }, () => {
  test('Verify that a small cart pays $7.95 shipping and 8% tax', { tags: ['smoke', 'P0', 'flow:CART-F01'] }, async ({ productPage, cartPage }) => {
    const lines = [{ product: PRODUCTS.pillow }];
    await productPage.addProducts(lines);
    await cartPage.open();
    await cartPage.expectTotals(expectedTotals(lines));
    await cartPage.expectMoreForFreeShipping(7500 - PRODUCTS.pillow.price);
  });

  test('Verify that a cart of $75 or more ships free', { tags: ['P0', 'flow:CART-F02'] }, async ({ productPage, cartPage }) => {
    const lines = [{ product: PRODUCTS.tarp }];
    await productPage.addProducts(lines);
    await cartPage.open();
    await cartPage.expectFreeShipping();
    await cartPage.expectTotals(expectedTotals(lines));
  });

  test('Verify that quantities multiply the line into the subtotal', { tags: ['P1', 'flow:CART-F03'] }, async ({ productPage, cartPage }) => {
    const lines = [{ product: PRODUCTS.mug, qty: 3 }];
    await productPage.addProducts(lines);
    await cartPage.open();
    await cartPage.expectTotals(expectedTotals(lines));
  });

  test(
    'Verify that WELCOME10 takes 10% off a cart of several products, once',
    { tags: ['smoke', 'bug:coupon_twice', 'P0', 'flow:CPN-F01'] },
    async ({ productPage, cartPage }) => {
      const lines = [{ product: PRODUCTS.tarp }, { product: PRODUCTS.pillow }];
      await productPage.addProducts(lines);
      await cartPage.open();
      await cartPage.applyCoupon(COUPONS.welcome10.code);
      await cartPage.expectCouponApplied(COUPONS.welcome10.code);
      await cartPage.expectTotals(expectedTotals(lines, COUPONS.welcome10), COUPONS.welcome10.code);
    },
  );
});
