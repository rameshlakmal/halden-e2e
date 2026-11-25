// A whole first visit written almost entirely as goals. The agent drives every screen; exact checks pin
// each outcome, and the money is still asserted to the cent.
import { expect, test } from '../../fixtures/fixtures.ts';
import { secrets, unique } from 'e2e';
import { ADDRESS, CARDS, expectedTotals, PRODUCTS } from '../../utils/shop-data.ts';

test.describe('First purchase', { tags: ['journey', 'agent', 'guest'] }, () => {
  test('Verify that a first-time visitor can sign up and buy a headlamp and a mug', { tags: ['P0', 'flow:CHK-F04', 'flow:ACCT-F03'] }, async ({ app, agent, screen, orderPage }) => {
    const { headlamp } = PRODUCTS;
    const expected = expectedTotals([{ product: headlamp }, { product: PRODUCTS.mug }]);

    await app.open('/');
    await agent.act('add the {first} and the {second} to the cart', {
      params: { first: headlamp.name, second: PRODUCTS.mug.name },
    });
    await expect(screen.getByRole('link', 'Cart, 2 items')).toBeVisible();

    await agent.act('go to checkout, and since you have no account, create one named {name} with email {email} and password {password}', {
      params: {
        name: ADDRESS.name,
        // unique() gives each run its own email while the replay cache still recognises the step.
        email: unique(`first-${Date.now()}@halden.test`),
        password: secrets.get('new-customer-password'),
      },
    });
    await expect(screen.getByRole('heading', 'Checkout', { level: 1 })).toBeVisible();

    await agent.act('ship to {line1}, {city} {postcode}, {country} and pay with card {card}', {
      params: { ...ADDRESS, card: CARDS.pays },
    });
    await orderPage.expectPlaced();
    await orderPage.expectTotals(expected);
    await orderPage.expectCharged(expected.total);
  });
});
