// Systematic screen sweep for one UI profile: every route × account × device, with real device emulation
// (touch, mobile viewport, device pixel ratio), which the e2e MCP sessions don't offer.
//
// Usage:
//   node .claude/skills/qa/scripts/sweep.ts --run <RUN> --profile <mobile|tablet|desktop>
//        --routes <RUN>/routes.json [--only "iPhone 15,Pixel 7"] [--route <name>]
//
// routes.json (written by the lead, see templates/routes.example.json):
//   { "routes": [ { "name": "cart", "path": "/cart", "accounts": ["guest", "shopper"],
//                   "waitFor": "Order summary", "mask": [] } ] }
// accounts: guest | shopper (maya) | jonas | ari | admin. Signed-in pages get the session cookie from the
// shop's API (utils/sign-in.ts), so passwords are never typed and screenshots stay available.
//
// For each page: a full-page screenshot, ui-audit.js, console errors and failed requests.
// Output: <RUN>/sweeps/<profile>/results.json, summary.md and shots/. Uses the shop already running on
// the test port, or starts it (and stops it at the end).
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium, devices, webkit, type Browser, type BrowserContextOptions } from 'playwright-core';
import { baseUrl, env } from '../../../../utils/env.ts';
import { sessionCookie } from '../../../../utils/sign-in.ts';
import { args, QA_DIR, rel } from './lib/qa.ts';

const a = args();
if (typeof a.run !== 'string' || typeof a.profile !== 'string' || typeof a.routes !== 'string') {
  console.error('Usage: sweep.ts --run <RUN> --profile <mobile|tablet|desktop> --routes <routes.json> [--only <devices>] [--route <name>]');
  process.exit(2);
}

interface Device { name: string; engine: 'chromium' | 'webkit'; ctx: BrowserContextOptions }

const device = (name: string): Device => {
  const d = devices[name];
  if (!d) throw new Error(`Unknown Playwright device: ${name}`);
  const { defaultBrowserType, ...ctx } = d;
  return { name, engine: defaultBrowserType === 'webkit' ? 'webkit' : 'chromium', ctx };
};
const width = (name: string, w: number, h: number, engine: Device['engine'] = 'chromium'): Device =>
  ({ name, engine, ctx: { viewport: { width: w, height: h }, deviceScaleFactor: 1 } });

const PROFILES: Record<string, () => Device[]> = {
  mobile: () => ['iPhone SE (3rd gen)', 'iPhone 15', 'iPhone 15 Pro Max', 'Galaxy S24', 'Pixel 7', 'iPhone 15 landscape'].map(device),
  tablet: () => [
    ...['iPad Mini', 'iPad Mini landscape', 'iPad (gen 7)', 'iPad Pro 11', 'iPad Pro 11 landscape', 'Galaxy Tab S9'].map(device),
    // Breakpoint boundaries: each pair must switch layout together, cleanly.
    width('boundary 767', 767, 1024), width('boundary 768', 768, 1024),
    width('boundary 1023', 1023, 768), width('boundary 1024', 1024, 768),
  ],
  desktop: () => [
    width('laptop 1280', 1280, 800), width('laptop 1366', 1366, 768), width('laptop 1440', 1440, 900),
    width('full HD 1920', 1920, 1080), width('2K 2560', 2560, 1440), width('Safari 1440', 1440, 900, 'webkit'),
  ],
};

const ACCOUNTS: Record<string, { email: string; password: () => string } | null> = {
  guest: null,
  shopper: { email: 'maya@halden.test', password: () => env.shopperPassword },
  jonas: { email: 'jonas@halden.test', password: () => env.shopperPassword },
  ari: { email: 'ari@halden.test', password: () => env.shopperPassword },
  admin: { email: 'admin@halden.test', password: () => env.adminPassword },
};

interface Route { name: string; path: string; accounts: string[]; waitFor?: string; mask?: string[] }
const routes: Route[] = JSON.parse(readFileSync(a.routes, 'utf8')).routes
  .filter((r: Route) => typeof a.route !== 'string' || r.name === a.route);

const only = typeof a.only === 'string' ? a.only.split(',').map((s) => s.trim()) : null;
const deviceList = PROFILES[a.profile]?.().filter((d) => !only || only.includes(d.name));
if (!deviceList) throw new Error(`Unknown profile ${a.profile}. Use mobile, tablet or desktop.`);

const out = resolve(a.run, 'sweeps', a.profile);
mkdirSync(join(out, 'shots'), { recursive: true });
const audit = readFileSync(join(QA_DIR, 'scripts/ui-audit.js'), 'utf8');

async function shopUp(): Promise<boolean> {
  try { return (await fetch(new URL('/', baseUrl))).ok; } catch { return false; }
}

let shop: ChildProcess | null = null;
if (!(await shopUp())) {
  shop = spawn(process.execPath, ['scripts/dev.js'], {
    cwd: env.shopDir, stdio: 'ignore',
    env: { ...process.env, PORT: String(env.port), DATABASE_URL: env.databaseUrl, SESSION_SECRET: env.sessionSecret },
  });
  for (let i = 0; i < 60 && !(await shopUp()); i++) await new Promise((r) => setTimeout(r, 500));
  if (!(await shopUp())) throw new Error(`The shop did not start at ${baseUrl}.`);
}

const cookies = new Map<string, { name: string; value: string }>();
async function cookieFor(account: string) {
  const acc = ACCOUNTS[account];
  if (acc === undefined) throw new Error(`Unknown account "${account}". Use: ${Object.keys(ACCOUNTS).join(', ')}`);
  if (acc === null) return null;
  if (!cookies.has(account)) cookies.set(account, await sessionCookie(acc.email, acc.password()));
  return cookies.get(account)!;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const browsers: Partial<Record<Device['engine'], Browser>> = {};
const results: unknown[] = [];

try {
  for (const d of deviceList) {
    browsers[d.engine] ??= await (d.engine === 'webkit' ? webkit : chromium).launch();
    for (const route of routes) {
      for (const account of route.accounts) {
        const context = await browsers[d.engine]!.newContext({ ...d.ctx, reducedMotion: 'reduce' });
        const cookie = await cookieFor(account);
        if (cookie) await context.addCookies([{ ...cookie, url: baseUrl }]);
        const page = await context.newPage();
        const consoleErrors: string[] = [];
        const failedRequests: string[] = [];
        page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
        page.on('response', (r) => { if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`); });
        const shot = join(out, 'shots', `${slug(route.name)}--${account}--${slug(d.name)}.png`);
        let error: string | null = null;
        let auditResult: { issues: { type: string; severity: string; text: string | null; detail: string }[] } = { issues: [] };
        try {
          await page.goto(new URL(route.path, baseUrl).toString(), { waitUntil: 'load' });
          if (route.waitFor) await page.getByText(route.waitFor).first().waitFor({ timeout: 15_000 });
          auditResult = await page.evaluate(`(${audit})()`);
          await page.screenshot({ path: shot, fullPage: true, mask: (route.mask ?? []).map((m) => page.locator(m)), animations: 'disabled' });
        } catch (e) {
          error = (e as Error).message.split('\n')[0]!;
        }
        results.push({ route: route.name, path: route.path, account, device: d.name, engine: d.engine, screenshot: rel(shot), error, consoleErrors, failedRequests, issues: auditResult.issues });
        await context.close();
        process.stdout.write('.');
      }
    }
  }
} finally {
  for (const b of Object.values(browsers)) await b?.close();
  shop?.kill();
}

type Result = { route: string; account: string; device: string; screenshot: string; error: string | null; consoleErrors: string[]; failedRequests: string[]; issues: { type: string; severity: string; text: string | null; detail: string }[] };
const rows = results as Result[];
writeFileSync(join(out, 'results.json'), JSON.stringify({ profile: a.profile, baseUrl, devices: deviceList.map((d) => d.name), results: rows }, null, 2));

const flagged = rows.filter((r) => r.error || r.consoleErrors.length || r.failedRequests.length || r.issues.some((i) => i.severity !== 'low'));
const md = [
  `# Sweep: ${a.profile}`, '',
  `${rows.length} pages (${routes.length} routes × accounts × ${deviceList.length} devices) · ${flagged.length} flagged. Flags are leads: open each screenshot before reporting anything.`, '',
  '| Route | Account | Device | Flags | Screenshot |', '|---|---|---|---|---|',
  ...flagged.map((r) => {
    const flags = [
      r.error && `load error: ${r.error}`,
      r.consoleErrors.length && `${r.consoleErrors.length} console error(s)`,
      r.failedRequests.length && `HTTP: ${r.failedRequests.slice(0, 3).join(', ')}`,
      ...Object.entries(r.issues.filter((i) => i.severity !== 'low').reduce<Record<string, number>>((n, i) => ({ ...n, [i.type]: (n[i.type] ?? 0) + 1 }), {})).map(([t, n]) => `${t} ×${n}`),
    ].filter(Boolean).join('; ');
    return `| ${r.route} | ${r.account} | ${r.device} | ${flags} | \`${r.screenshot}\` |`;
  }),
  '', `Full detail: \`${rel(join(out, 'results.json'))}\``, '',
];
writeFileSync(join(out, 'summary.md'), md.join('\n'));
console.log(`\n${rows.length} pages, ${flagged.length} flagged → ${rel(join(out, 'summary.md'))}`);
