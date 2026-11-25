import { expect, type App, type Locator, type Screen } from 'e2e';
import { ADDRESS, usd } from '../utils/shop-data.ts';

export class CheckoutPage {
  private readonly app: App;
  private readonly screen: Screen;

  private readonly heading: Locator;
  private readonly fullName: Locator;
  private readonly address: Locator;
  private readonly city: Locator;
  private readonly postcode: Locator;
  private readonly country: Locator;
  private readonly cardNumber: Locator;
  private readonly payButton: Locator;

  constructor(app: App, screen: Screen) {
    this.app = app;
    this.screen = screen;
    this.heading = screen.getByRole('heading', 'Checkout', { level: 1 });
    this.fullName = screen.getByLabel('Full name');
    this.address = screen.getByLabel('Address');
    this.city = screen.getByLabel('City');
    this.postcode = screen.getByLabel('Postcode');
    this.country = screen.getByLabel('Country');
    this.cardNumber = screen.getByLabel('Card number');
    this.payButton = screen.getByRole('button', /^Pay \$/);
  }

  async open() {
    await this.app.open('/checkout');
    await this.cardNumber.waitFor({ state: 'visible' });
  }

  async fillShipping(address: typeof ADDRESS = ADDRESS) {
    await this.fullName.fill(address.name);
    await this.address.fill(address.line1);
    await this.city.fill(address.city);
    await this.postcode.fill(address.postcode);
    await this.country.selectOption(address.country);
  }

  async pay(card: string) {
    await this.cardNumber.fill(card);
    await this.payButton.tap();
  }

  async expectOnCheckout() {
    await expect(this.heading).toBeVisible();
  }

  async expectPayAmount(cents: number) {
    await expect(this.payButton).toHaveText(`Pay ${usd(cents)}`);
  }

  async expectError(message: string) {
    await expect(this.screen.getByText(message, { exact: true })).toBeVisible();
  }
}
