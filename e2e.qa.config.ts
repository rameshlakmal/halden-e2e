// The QA team's config: the project's config with one target per device, for the `e2e mcp` server the
// Claude Code QA agents drive (.mcp.json). Each agent opens its own session on its own target, so five testers
// can look at the shop at once, on a phone, a tablet and a desktop, without sharing a browser.
//
// It never runs the suite: `e2e run` keeps using e2e.config.ts. All targets share one shop process
// (reuseExisting), started by the first session and stopped when the last one closes.
import { web } from '@e2e-dev/web';
import type { E2EConfig } from 'e2e';
import base from './e2e.config.ts';
import { env } from './utils/env.ts';

const shared: E2EConfig = base;
const [chromium] = shared.targets;
if (!chromium?.app || !('url' in chromium.app)) throw new Error('e2e.qa.config.ts expects e2e.config.ts to declare a web target with an app URL.');

const app = {
  ...chromium.app,
  command: chromium.app.command ? { ...chromium.app.command, reuseExisting: true } : undefined,
};

/** Device targets. The sweep script (sweep.ts) covers the full device matrix with real touch emulation. */
export const QA_TARGETS = {
  /** Functional, explorer, desktop-ui, test-analyst and spec-builder: a 15" laptop at 125%. */
  desktop: web({ viewport: { width: 1440, height: 900 } }),
  /** desktop-ui's Safari pass. */
  'desktop-webkit': web({ browser: 'webkit', viewport: { width: 1440, height: 900 } }),
  /** mobile-ui: iPhone 15 CSS size on the Safari engine. */
  iphone: web({ browser: 'webkit', viewport: { width: 393, height: 659 } }),
  /** mobile-ui: Pixel 7 CSS size on the Chrome engine. */
  pixel: web({ viewport: { width: 412, height: 839 } }),
  /** tablet-ui: iPad Pro 11 portrait on the Safari engine; browser.setViewport for landscape. */
  ipad: web({ browser: 'webkit', viewport: { width: 834, height: 1194 } }),
} as const;

export default {
  ...shared,
  targets: Object.entries(QA_TARGETS).map(([name, engine]) => ({ name, engine, app })),
  credentials: {
    ...shared.credentials,
    // Two more shoppers, so parallel testers never share an account (the seed gives all shoppers one password).
    jonas: { username: 'jonas@halden.test', password: () => env.shopperPassword },
    ari: { username: 'ari@halden.test', password: () => env.shopperPassword },
  },
  retries: 0,
  reporters: ['list'],
} satisfies E2EConfig;
