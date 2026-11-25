// Creates the test database named in DATABASE_URL (once), then seeds it with the shop's own script.
// Usage: npm run db:create
import pg from 'pg';
import { env } from '../utils/env.ts';
import { assertTestDatabase, resetShop } from '../utils/shop-db.ts';

assertTestDatabase();
const target = new URL(env.databaseUrl);
const name = decodeURIComponent(target.pathname.replace(/^\//, ''));
if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error(`Use a plain database name in DATABASE_URL, not "${name}".`);

const admin = new URL(target);
admin.pathname = '/postgres';
const client = new pg.Client({ connectionString: admin.toString() });
await client.connect();
try {
  const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
  if (rowCount) console.log(`Database ${name} already exists.`);
  else {
    await client.query(`CREATE DATABASE ${name}`);
    console.log(`Created database ${name}.`);
  }
} finally {
  await client.end();
}

await resetShop();
console.log('Seeded it with the shop catalogue, demo accounts and past orders.');
