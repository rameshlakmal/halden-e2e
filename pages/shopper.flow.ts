import type { CartPage } from './cart.page.ts';
import type { CheckoutPage } from './checkout.page.ts';
import type { OrderPage } from './order.page.ts';
import type { ProductPage } from './product.page.ts';
import { CARDS, type Product } from '../utils/shop-data.ts';

/** A signed-in shopper's whole purchase, for tests whose subject starts after the order exists. */
export class ShopperFlow {
  private readonly productPage: ProductPage;
  private readonly cartPage: CartPage;
  private readonly checkoutPage: CheckoutPage;
  private readonly orderPage: OrderPage;

  constructor(productPage: ProductPage, cartPage: CartPage, checkoutPage: CheckoutPage, orderPage: OrderPage) {
    this.productPage = productPage;
    this.cartPage = cartPage;
    this.checkoutPage = checkoutPage;
    this.orderPage = orderPage;
  }

  /** Adds the products, applies the coupon, pays with the test card and returns the new order's number. */
  async buy(lines: readonly { product: Product; qty?: number }[], { coupon }: { coupon?: string } = {}): Promise<string> {
    await this.productPage.addProducts(lines);
    await this.cartPage.open();
    if (coupon) {
      await this.cartPage.applyCoupon(coupon);
      await this.cartPage.expectCouponApplied(coupon);
    }
    await this.cartPage.checkout();
    await this.checkoutPage.expectOnCheckout();
    await this.checkoutPage.fillShipping();
    await this.checkoutPage.pay(CARDS.pays);
    await this.orderPage.expectPlaced();
    return this.orderPage.orderId();
  }
}
