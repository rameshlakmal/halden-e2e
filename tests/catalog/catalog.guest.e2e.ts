import { expect, test } from '../../fixtures/fixtures.ts';
import { PRODUCTS } from '../../utils/shop-data.ts';

test.describe('Catalogue', { tags: ['catalog', 'guest'] }, () => {
  test('Verify that a guest can find a tent by browsing the Shelter category', { tags: ['smoke', 'agent', 'P1', 'flow:CAT-F01'] }, async ({ app, agent, screen }) => {
    await app.open('/');
    // The agent picks the path (menu, category page, product card); the test pins where it must end up.
    await agent.act('open the Shelter category and then open the {product} product page', {
      params: { product: PRODUCTS.tent.name },
    });
    await expect(screen.getByRole('heading', PRODUCTS.tent.name, { level: 1 })).toBeVisible();
  });

  test('Verify that a sold-out product cannot be added to the cart', { tags: ['P0', 'flow:CAT-F02'] }, async ({ productPage, screen }) => {
    await productPage.open(PRODUCTS.pad);
    await productPage.expectStockNote('Sold out');
    await expect(screen.getByRole('button', 'Add to cart')).toBeHidden();
  });

  test('Verify that a product with low stock says how many are left', { tags: ['P1', 'flow:CAT-F03'] }, async ({ productPage }) => {
    await productPage.open(PRODUCTS.hammock);
    await productPage.expectStockNote(`Only ${PRODUCTS.hammock.stock} left`);
  });
});
