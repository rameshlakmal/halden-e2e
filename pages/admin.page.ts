import { expect, type App, type Locator, type Screen } from 'e2e';
import type { Product } from '../utils/shop-data.ts';

/** The staff admin. An order opened here renders with the customer's layout, so OrderPage asserts on it. */
export class AdminPage {
  private readonly app: App;
  private readonly screen: Screen;

  private readonly notice: Locator;
  private readonly bugCount: Locator;

  constructor(app: App, screen: Screen) {
    this.app = app;
    this.screen = screen;
    this.notice = screen.getByRole('status');
    this.bugCount = screen.getByRole('navigation', 'Admin').getByRole('link', /^QA lab/);
  }

  private tabHeading(name: string) {
    return this.screen.getByRole('heading', name, { level: 1 });
  }

  private priceInput(product: Product) {
    return this.screen.getByLabel(`Price of ${product.name}`);
  }

  private bugSwitch(title: string) {
    return this.screen.getByRole('checkbox', title);
  }

  async openProducts() {
    await this.app.open('/admin#products');
    await this.tabHeading('Products').waitFor({ state: 'visible' });
  }

  async openQaLab() {
    await this.app.open('/admin#qa');
    await this.tabHeading('QA lab').waitFor({ state: 'visible' });
  }

  async openOrder(id: string) {
    await this.app.open(`/admin#orders/${id}`);
    await this.screen.getByRole('region', 'Payment').waitFor({ state: 'visible' });
  }

  /** Types a new price and presses Enter, as the Products tab asks. */
  async setPrice(product: Product, cents: number) {
    const input = this.priceInput(product);
    await input.fill((cents / 100).toFixed(2));
    await input.press('Enter');
  }

  async switchBug(title: string, on: boolean) {
    if (on) await this.bugSwitch(title).check();
    else await this.bugSwitch(title).uncheck();
  }

  async expectNotice(text: string) {
    await expect(this.notice).toContainText(text);
  }

  async expectBugSwitch(title: string, on: boolean) {
    await expect(this.bugSwitch(title)).toBeChecked({ checked: on });
  }

  async expectBugsOn(count: number) {
    await expect(this.bugCount).toHaveText(count === 0 ? 'QA lab' : `QA lab ${count} on`);
  }
}
