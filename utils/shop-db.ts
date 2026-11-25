// Direct access to the shop's database: reset it, switch planted bugs, and check the business rules.
// Tests drive the UI; this is the ground truth underneath it.
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import pg from 'pg';
import { env, type BugKey } from './env.ts';

const run = promisify(execFile);

/**
 * Refuses any database that isn't on this machine. The shop's own .env points at the live demo,
 * and its seed script drops every table, so an empty or remote DATABASE_URL must never get this far.
 */
export function assertTestDatabase(url = env.databaseUrl): void {
  if (!url) throw new Error('DATABASE_URL is not set. Copy .env.example to .env and point it at a local test database.');
  const host = new URL(url).hostname;
  const local = ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(host);
  if (!local && process.env.HALDEN_ALLOW_REMOTE_DB !== '1') {
    throw new Error(`DATABASE_URL points at ${host}. Tests reset the database, so they only run against a local one ` +
      '(set HALDEN_ALLOW_REMOTE_DB=1 to override for a disposable remote database).');
  }
}

let pool: pg.Pool | null = null;
function db(): pg.Pool {
  assertTestDatabase();
  pool ??= new pg.Pool({ connectionString: env.databaseUrl, max: 2 });
  return pool;
}

export async function closeDb(): Promise<void> {
  await pool?.end();
  pool = null;
}

/** Drops and reseeds the shop with its own seed script: catalogue, demo accounts, past orders, all bugs off. */
export async function resetShop(): Promise<void> {
  assertTestDatabase();
  await run(process.execPath, ['scripts/db-setup.js'], {
    cwd: env.shopDir,
    env: {
      ...process.env,
      DATABASE_URL: env.databaseUrl,
      SEED_ADMIN_PASSWORD: env.adminPassword,
      SEED_SHOPPER_PASSWORD: env.shopperPassword,
    },
  });
}

/** Switches exactly these planted bugs on and every other one off. */
export async function setBugs(keys: readonly BugKey[]): Promise<void> {
  await db().query('UPDATE qa_bugs SET enabled = key = ANY($1::text[])', [keys]);
}

export async function enabledBugs(): Promise<string[]> {
  const { rows } = await db().query<{ key: string }>('SELECT key FROM qa_bugs WHERE enabled ORDER BY position');
  return rows.map((r) => r.key);
}

export interface BrokenRule {
  rule: string;
  rows: Record<string, unknown>[];
}

interface Rule {
  name: string;
  sql: string;
}

let rules: Rule[] | null = null;

/**
 * The shop's business rules, read from its qa/rules.sql. Each rule is a query returning the rows that break it.
 * The file is written for Propmaster, where {{orders}} means "the orders this session touched"; the database
 * is freshly seeded before every test here, so each placeholder becomes the whole table.
 */
async function loadRules(): Promise<Rule[]> {
  if (rules) return rules;
  const text = await readFile(resolve(env.shopDir, 'qa/rules.sql'), 'utf8');
  rules = text.split(/^-- rule: /m).slice(1).map((chunk) => {
    const [title = '', ...body] = chunk.split('\n');
    const sql = body.filter((line) => !line.startsWith('--')).join('\n').replace(/\{\{(\w+)\}\}/g, '$1').trim().replace(/;$/, '');
    return { name: title.replace(/\s+\[.*\]\s*$/, '').trim(), sql };
  });
  return rules;
}

/** Runs every business rule and returns the ones that are broken, with the offending rows. */
export async function checkRules(): Promise<BrokenRule[]> {
  const broken: BrokenRule[] = [];
  for (const rule of await loadRules()) {
    const { rows } = await db().query(rule.sql);
    if (rows.length > 0) broken.push({ rule: rule.name, rows });
  }
  return broken;
}

export async function ruleNames(): Promise<string[]> {
  return (await loadRules()).map((r) => r.name);
}

/** Stock on hand for a product, by its slug. */
export async function stockOf(slug: string): Promise<number> {
  const { rows: [row] } = await db().query<{ stock: number }>(
    'SELECT i.stock FROM inventory i JOIN products p ON p.id = i.product_id WHERE p.slug = $1', [slug]);
  if (!row) throw new Error(`No product with slug ${slug}.`);
  return row.stock;
}

export interface OrderRecord {
  id: string;
  status: string;
  subtotal: string;
  discount: string;
  shipping: string;
  tax: string;
  total: string;
  couponCode: string | null;
  payment: { amount: string; status: string } | null;
  lines: { name: string; unitPrice: string; qty: number; lineTotal: string }[];
}

/** One order as the database holds it, money as exact decimal strings. */
export async function orderRecord(id: string): Promise<OrderRecord | null> {
  const { rows: [order] } = await db().query(`
    SELECT o.id::text, o.status::text, o.subtotal::text, o.discount::text, o.shipping::text, o.tax::text, o.total::text,
           o.coupon_code AS "couponCode",
           (SELECT json_build_object('amount', p.amount::text, 'status', p.status::text) FROM payments p WHERE p.order_id = o.id) AS payment
      FROM orders o WHERE o.id = $1`, [id]);
  if (!order) return null;
  const { rows: lines } = await db().query(`
    SELECT name, unit_price::text AS "unitPrice", qty, line_total::text AS "lineTotal"
      FROM order_items WHERE order_id = $1 ORDER BY product_id`, [id]);
  return { ...order, lines } as OrderRecord;
}

/** The newest order's id, for a test that just placed one. */
export async function latestOrderId(): Promise<string> {
  const { rows: [row] } = await db().query<{ id: string }>('SELECT id::text FROM orders ORDER BY id DESC LIMIT 1');
  if (!row) throw new Error('There are no orders.');
  return row.id;
}
