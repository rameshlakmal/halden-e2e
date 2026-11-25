// Saves the signed-in sessions the other tests declare with { session: 'shopper' | 'admin' }.
// The database is reseeded before every test, but the demo accounts keep their ids, so the cookies stay valid.
import { expect, test } from '../fixtures/fixtures.ts';
import { baseUrl, env } from '../utils/env.ts';
import { sessionCookie } from '../utils/sign-in.ts';

test.setup('Sign in as Maya, a shopper', { sessions: ['shopper'] }, async ({ app, browser, session, accountPage }) => {
  await browser.setCookies([{ ...(await sessionCookie('maya@halden.test', env.shopperPassword)), url: baseUrl }]);
  await app.open('/account');
  await accountPage.expectGreeting('Maya');
  await session.save('shopper');
});

// Two more shoppers, so parallel bug-bash explorers never share an account (and never report each other's orders).
for (const [session, email, firstName] of [['jonas', 'jonas@halden.test', 'Jonas'], ['ari', 'ari@halden.test', 'Ari']] as const) {
  test.setup(`Sign in as ${firstName}, a shopper`, { sessions: [session] }, async ({ app, browser, session: saved, accountPage }) => {
    await browser.setCookies([{ ...(await sessionCookie(email, env.shopperPassword)), url: baseUrl }]);
    await app.open('/account');
    await accountPage.expectGreeting(firstName);
    await saved.save(session);
  });
}

test.setup('Sign in as shop staff', { sessions: ['admin'] }, async ({ app, browser, session, screen }) => {
  await browser.setCookies([{ ...(await sessionCookie('admin@halden.test', env.adminPassword)), url: baseUrl }]);
  await app.open('/admin');
  await expect(screen.getByRole('heading', 'Overview', { level: 1 })).toBeVisible();
  await session.save('admin');
});
