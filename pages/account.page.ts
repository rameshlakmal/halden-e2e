import { expect, type App, type Locator, type Screen } from 'e2e';
import { usd } from '../utils/shop-data.ts';

export class AccountPage {
  private readonly app: App;
  private readonly screen: Screen;

  private readonly ordersHeading: Locator;

  constructor(app: App, screen: Screen) {
    this.app = app;
    this.screen = screen;
    this.ordersHeading = screen.getByRole('heading', 'Your orders', { level: 2 });
  }

  private orderRow(id: string) {
    return this.screen.getByRole('link').filter({ hasText: `Order #${id}` });
  }

  async open() {
    await this.app.open('/account');
    await this.ordersHeading.waitFor({ state: 'visible' });
  }

  async openOrder(id: string) {
    await this.orderRow(id).tap();
  }

  async expectGreeting(firstName: string) {
    await expect(this.screen.getByRole('heading', `Hello, ${firstName}`, { level: 1 })).toBeVisible();
  }

  async expectOrderListed(id: string, totalCents: number, status: string) {
    const row = this.orderRow(id);
    await expect(row).toContainText(usd(totalCents));
    await expect(row).toContainText(status);
  }
}
