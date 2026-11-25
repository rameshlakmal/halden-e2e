import { github } from '@e2e-dev/github';
import { web } from '@e2e-dev/web';
import type { E2EConfig } from 'e2e';
import { agents } from './agents/personas.ts';
import { baseUrl, env } from './utils/env.ts';
import { assertTestDatabase } from './utils/shop-db.ts';

// The shop's dev server loads the shop repo's .env, which points at the live demo's database.
// Ours wins only when it is set, so refuse to start without a local test database.
assertTestDatabase();

export default {
  tests: ['tests/**/*.e2e.ts', '!tests/bugbash/**'],
  targets: [
    {
      name: 'chromium',
      engine: web(),
      app: {
        url: baseUrl,
        // The shop's own dev server, from its repo, on a test-only port and a test-only database.
        command: {
          executable: process.execPath,
          args: ['scripts/dev.js'],
          cwd: env.shopDir,
          env: {
            PORT: String(env.port),
            DATABASE_URL: env.databaseUrl,
            SESSION_SECRET: env.sessionSecret,
          },
          log: '.e2e/logs/shop.log',
        },
      },
    },
  ],
  // Every test resets the one shared database, so tests run one at a time.
  workers: 1,
  timeout: 180_000,
  agents,
  credentials: {
    admin: { username: 'admin@halden.test', password: () => env.adminPassword },
    shopper: { username: 'maya@halden.test', password: () => env.shopperPassword },
  },
  secrets: {
    // The password for accounts the tests create themselves; throwaway, but never shown to the model.
    'new-customer-password': () => process.env.HALDEN_NEW_CUSTOMER_PASSWORD ?? 'trail-mix-2026',
  },
  reporters: ['list', 'markdown', github()],
} satisfies E2EConfig;
