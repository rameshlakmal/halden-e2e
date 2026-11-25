import { expect, type App, type Locator, type Screen } from 'e2e';
import { usd, type Product, type Totals } from '../utils/shop-data.ts';

/** One order, as the customer sees it at /order?id=… and staff at /admin#orders/… (the same layout). */
export class OrderPage {
  private readonly app: App;
  private readonly screen: Screen;

  private readonly heading: Locator;
  private readonly placedNotice: Locator;
  private readonly items: Locator;
  private readonly payment: Locator;
  private readonly cancelButton: Locator;
  private readonly confirmDialog: Locator;
  private readonly notice: Locator;

  constructor(app: App, screen: Screen) {
    this.app = app;
    this.screen = screen;
    this.heading = screen.getByRole('heading', { level: 1 });
    this.placedNotice = screen.getByText('Thank you, your order is placed.');
    this.items = screen.getByRole('region', 'Items');
    this.payment = screen.getByRole('region', 'Payment');
    // The dialog holds a second "Cancel order" button; until it opens, only the page's own is visible.
    this.cancelButton = screen.getByRole('button', 'Cancel order', { visible: true });
    this.confirmDialog = screen.getByRole('dialog');
    this.notice = screen.getByRole('status');
  }

  async open(id: string) {
    await this.app.open(`/order?id=${id}`);
    await this.payment.waitFor({ state: 'visible' });
  }

  /** The number of the order on screen, from its heading ("Order #7 Paid"). */
  async orderId(): Promise<string> {
    await expect(this.heading).toContainText('Order #');
    const text = (await this.heading.textContent()) ?? '';
    const id = /#(\d+)/.exec(text)?.[1];
    if (!id) throw new Error(`No order number in the heading "${text}".`);
    return id;
  }

  async cancel() {
    await this.cancelButton.tap();
    await this.confirmDialog.getByRole('button', 'Cancel order').tap();
  }

  async expectPlaced() {
    await expect(this.placedNotice).toBeVisible();
  }

  async expectStatus(status: 'Paid' | 'Shipped' | 'Delivered' | 'Cancelled') {
    await expect(this.heading).toContainText(status);
  }

  async expectCancelledAndRefunded() {
    await expect(this.notice).toContainText('Order cancelled and refunded.');
    await this.expectStatus('Cancelled');
  }

  async expectTotals(t: Totals, couponCode?: string) {
    await expect(this.payment).toContainText(`Subtotal ${usd(t.subtotal)}`);
    if (t.discount > 0) await expect(this.payment).toContainText(`Discount (${couponCode}) −${usd(t.discount)}`);
    await expect(this.payment).toContainText(`Shipping ${t.shipping === 0 ? 'Free' : usd(t.shipping)}`);
    await expect(this.payment).toContainText(`Tax ${usd(t.tax)}`);
    await expect(this.payment).toContainText(`Total ${usd(t.total)}`);
  }

  /** The payment line under the totals: what the card was really charged. */
  async expectCharged(cents: number) {
    await expect(this.payment).toContainText(`Charged ${usd(cents)} to the card ending 4242`);
  }

  async expectRefunded(cents: number) {
    await expect(this.payment).toContainText(`Refunded ${usd(cents)} to the card ending 4242`);
  }

  /** One line of the order: "2 × $32.00", priced as it was when the order was placed. */
  async expectLine(product: Product, qty: number, unitPriceCents: number) {
    await expect(this.items).toContainText(`${product.name}`);
    await expect(this.items).toContainText(`${qty} × ${usd(unitPriceCents)}`);
  }
}
