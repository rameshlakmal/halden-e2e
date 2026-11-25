import { expect, type App, type Locator, type Screen } from 'e2e';
import type { Product } from '../utils/shop-data.ts';

export class ProductPage {
  private readonly app: App;
  private readonly screen: Screen;

  private readonly addToCartButton: Locator;
  private readonly oneMoreButton: Locator;
  private readonly notice: Locator;

  constructor(app: App, screen: Screen) {
    this.app = app;
    this.screen = screen;
    this.addToCartButton = screen.getByRole('button', 'Add to cart');
    this.oneMoreButton = screen.getByRole('button', 'One more');
    // Toasts land in a live region; the quantity stepper's <output> is a second "status", so match by text.
    this.notice = screen.getByRole('status').filter({ hasText: 'Added to your cart.' });
  }

  private heading(product: Product) {
    return this.screen.getByRole('heading', product.name, { level: 1 });
  }

  async open(product: Product) {
    await this.app.open(`/product?slug=${product.slug}`);
    await this.heading(product).waitFor({ state: 'visible' });
  }

  async addToCart(qty = 1) {
    for (let i = 1; i < qty; i++) await this.oneMoreButton.tap();
    await this.addToCartButton.tap();
  }

  /** Opens each product and adds it, waiting for the shop to confirm every add. */
  async addProducts(lines: readonly { product: Product; qty?: number }[]) {
    for (const line of lines) {
      await this.open(line.product);
      await this.addToCart(line.qty);
      await this.expectAddedToCart();
    }
  }

  async expectAddedToCart() {
    await expect(this.notice).toContainText('Added to your cart.');
  }

  /** The stock note a low-stock product shows: "Only 3 left", or "Sold out". */
  async expectStockNote(text: string) {
    await expect(this.screen.getByText(text, { exact: true })).toBeVisible();
  }
}
