import { expect, type App, type Locator, type Screen } from 'e2e';
import { usd, type Totals } from '../utils/shop-data.ts';

/**
 * The cart and its order summary. The summary prints each total as "Label $amount", so the
 * assertions read it as one text block (the dt/dd pairs have no role a locator could target).
 */
export class CartPage {
  private readonly app: App;
  private readonly screen: Screen;

  private readonly summary: Locator;
  private readonly couponInput: Locator;
  private readonly applyButton: Locator;
  private readonly removeCouponButton: Locator;
  private readonly checkoutLink: Locator;

  constructor(app: App, screen: Screen) {
    this.app = app;
    this.screen = screen;
    this.summary = screen.getByRole('complementary', 'Order summary');
    this.couponInput = screen.getByLabel('Discount code');
    this.applyButton = screen.getByRole('button', 'Apply');
    this.removeCouponButton = this.summary.getByRole('button', 'Remove');
    this.checkoutLink = screen.getByRole('link', 'Check out');
  }

  async open() {
    await this.app.open('/cart');
    await this.summary.waitFor({ state: 'visible' });
  }

  async applyCoupon(code: string) {
    await this.couponInput.fill(code);
    await this.applyButton.tap();
  }

  async removeCoupon() {
    await this.removeCouponButton.tap();
  }

  async checkout() {
    await this.checkoutLink.tap();
  }

  async expectCouponApplied(code: string) {
    await expect(this.summary.getByText(`${code} applied`)).toBeVisible();
  }

  async expectCouponRefused(message: string) {
    await expect(this.screen.getByText(message, { exact: true })).toBeVisible();
    await expect(this.couponInput).toBeVisible();
  }

  async expectTotals(t: Totals, couponCode?: string) {
    await expect(this.summary).toContainText(`Subtotal ${usd(t.subtotal)}`);
    if (t.discount > 0) await expect(this.summary).toContainText(`Discount (${couponCode}) −${usd(t.discount)}`);
    await expect(this.summary).toContainText(`Shipping ${t.shipping === 0 ? 'Free' : usd(t.shipping)}`);
    await expect(this.summary).toContainText(`Tax (8%) ${usd(t.tax)}`);
    await expect(this.summary).toContainText(`Total ${usd(t.total)}`);
  }

  async expectFreeShipping() {
    await expect(this.summary.getByText('Your order ships free.')).toBeVisible();
  }

  async expectMoreForFreeShipping(cents: number) {
    await expect(this.summary.getByText(`Add ${usd(cents)} more for free shipping.`)).toBeVisible();
  }
}
