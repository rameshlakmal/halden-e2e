// One place that reads the environment. e2e loads no .env file itself, so the config and
// every helper import this module first.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const envFile = resolve(ROOT, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

/** The planted bugs the shop's QA lab can switch on (lib/bugs.js in the shop repo). */
export const BUG_KEYS = [
  'coupon_twice',
  'cancel_keeps_stock',
  'payment_misses_shipping',
  'price_edit_rewrites_orders',
  'coupon_limit_ignored',
] as const;
export type BugKey = (typeof BUG_KEYS)[number];

function list(value: string | undefined): BugKey[] {
  const keys = (value ?? '').split(',').map((k) => k.trim()).filter(Boolean);
  for (const key of keys) {
    if (!BUG_KEYS.includes(key as BugKey)) throw new Error(`HALDEN_BUGS: unknown bug "${key}". Known: ${BUG_KEYS.join(', ')}.`);
  }
  return keys as BugKey[];
}

export const env = {
  root: ROOT,
  shopDir: resolve(ROOT, process.env.HALDEN_SHOP_DIR ?? '../../sql/halden-shop'),
  databaseUrl: process.env.DATABASE_URL ?? '',
  sessionSecret: process.env.SESSION_SECRET ?? '',
  adminPassword: process.env.SEED_ADMIN_PASSWORD ?? '',
  shopperPassword: process.env.SEED_SHOPPER_PASSWORD ?? '',
  /** The shop's port for tests; not the 3100 its own `npm run dev` uses. */
  port: Number(process.env.HALDEN_PORT ?? 3199),
  model: process.env.HALDEN_MODEL || 'anthropic/claude-haiku-5.5',
  exploreModel: process.env.HALDEN_EXPLORE_MODEL || 'anthropic/claude-sonnet-5.5',
  bugs: list(process.env.HALDEN_BUGS),
  dbRules: process.env.HALDEN_DB_RULES === '1',
  /** Set by the bug bash: explorers share one prepared shop, so no test may reseed it under them. */
  keepShop: process.env.HALDEN_KEEP_SHOP === '1',
};

export const baseUrl = `http://127.0.0.1:${env.port}`;
