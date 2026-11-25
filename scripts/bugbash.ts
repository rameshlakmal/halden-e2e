// The blind bug bash: switch planted bugs on, run every charter in bugbash/charters.txt as a parallel
// `e2e explore`, and collect what the explorers report. Round "eyes" uses the screen-only personas;
// round "auditor" reruns the same charters with database tools. Findings are claims: triage each one
// and prove it with a repro test under tests/bugbash/ before calling it a bug.
//
// Usage: node scripts/bugbash.ts [--round eyes|auditor|both] [--bugs key,key] [--max-steps 6]
import { spawn, type ChildProcess } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { baseUrl, BUG_KEYS, env, type BugKey } from '../utils/env.ts';
import { closeDb, resetShop, setBugs } from '../utils/shop-db.ts';

const { values: opts } = parseArgs({
  options: {
    round: { type: 'string', default: 'both' },
    bugs: { type: 'string', default: BUG_KEYS.join(',') },
    'max-steps': { type: 'string', default: '6' },
  },
});
const rounds = opts.round === 'both' ? ['eyes', 'auditor'] : [opts.round!];
const bugs = opts.bugs!.split(',').filter(Boolean) as BugKey[];

interface Charter {
  slug: string;
  session: string;
  persona: string;
  goal: string;
}

const charters: Charter[] = readFileSync(resolve(env.root, 'bugbash/charters.txt'), 'utf8')
  .split('\n')
  .filter((line) => line.trim() && !line.startsWith('#'))
  .map((line) => {
    const [slug = '', session = '', persona = '', ...goal] = line.split('|');
    return { slug, session, persona, goal: goal.join('|').trim() };
  });

const E2E_CLI = resolve(env.root, 'node_modules/e2e/dist/cli/bin.js');

function startShop(): ChildProcess {
  const log = createWriteStream(resolve(env.root, '.e2e/bugbash/shop.log'));
  const shop = spawn(process.execPath, ['scripts/dev.js'], {
    cwd: env.shopDir,
    env: { ...process.env, PORT: String(env.port), DATABASE_URL: env.databaseUrl, SESSION_SECRET: env.sessionSecret },
  });
  shop.stdout?.pipe(log);
  shop.stderr?.pipe(log);
  return shop;
}

async function waitForShop(): Promise<void> {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(new URL('/api/products', baseUrl))).ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`The shop did not start at ${baseUrl}; see .e2e/bugbash/shop.log.`);
}

function explore(round: string, c: Charter): Promise<number> {
  const output = `.e2e/bugbash/${round}/${c.slug}`;
  mkdirSync(resolve(env.root, output), { recursive: true });
  const agent = round === 'auditor' ? 'auditor' : c.persona;
  const log = createWriteStream(resolve(env.root, `${output}.log`));
  const childEnv: NodeJS.ProcessEnv = { ...process.env, HALDEN_KEEP_SHOP: '1' };
  delete childEnv.CI; // explore's video and session handling assume a local run
  // The CLI runs straight through Node, never a shell, so a charter's quotes and "$75" arrive as written.
  const child = spawn(process.execPath, [
    E2E_CLI, 'explore', c.goal,
    '--config', 'e2e.bugbash.config.ts', '--agent', agent, '--session', c.session,
    '--output', output, '--max-steps', opts['max-steps']!, '--reporter', 'list,markdown', '--video',
  ], { cwd: env.root, env: childEnv });
  child.stdout?.pipe(log);
  child.stderr?.pipe(log);
  return new Promise((done) => child.on('exit', (code) => done(code ?? 1)));
}

interface Finding {
  kind: string;
  severity: number;
  title: string;
  expected: string;
  actual: string;
  path?: string;
  reproduction: string[];
}

const SEVERITY = ['', 'trivial', 'low', 'medium', 'high', 'critical'];

function collect(round: string, c: Charter, exitCode: number) {
  const output = resolve(env.root, `.e2e/bugbash/${round}/${c.slug}`);
  const log = existsSync(`${output}.log`) ? readFileSync(`${output}.log`, 'utf8') : '';
  const report = existsSync(resolve(output, 'report.json')) ? JSON.parse(readFileSync(resolve(output, 'report.json'), 'utf8')) : null;
  const run = report?.run?.explore;
  return {
    charter: c.slug,
    agent: round === 'auditor' ? 'auditor' : c.persona,
    exitCode,
    ended: run?.ended ?? 'no report',
    steps: run?.steps?.length ?? 0,
    findings: (run?.findings ?? []) as Finding[],
    assessment: run?.summary ?? '',
    // The terminal summary's AI row carries the run's model spend; keep it as printed.
    ai: /^\s*AI\s+(.+)$/m.exec(log)?.[1]?.trim() ?? 'n/a',
    duration: /^\s*Duration\s+(.+)$/m.exec(log)?.[1]?.trim() ?? 'n/a',
  };
}

const date = new Date().toISOString().slice(0, 10);
rmSync(resolve(env.root, '.e2e/bugbash'), { recursive: true, force: true });
mkdirSync(resolve(env.root, '.e2e/bugbash'), { recursive: true });
mkdirSync(resolve(env.root, 'docs/bugbash'), { recursive: true });

const all: Record<string, ReturnType<typeof collect>[]> = {};
for (const round of rounds) {
  console.log(`\n=== Round "${round}": ${charters.length} charters, bugs on: ${bugs.join(', ') || 'none'} ===`);
  await resetShop();
  await setBugs(bugs);
  const shop = startShop();
  try {
    await waitForShop();
    const codes = await Promise.all(charters.map((c) => explore(round, c)));
    all[round] = charters.map((c, i) => collect(round, c, codes[i]!));
  } finally {
    shop.kill();
  }

  const md = [
    `# Bug bash, round "${round}" (${date})`,
    '',
    `Planted bugs switched on (not told to the explorers): ${bugs.map((b) => `\`${b}\``).join(', ')}.`,
    `Explorers: ${round === 'auditor' ? 'the auditor (skeptic persona + check_business_rules + get_order_record)' : 'screen-only personas'}; up to ${opts['max-steps']} steps per charter.`,
    '',
    '| Charter | Agent | Ended | Steps | Issues | Warnings | AI | Duration |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...all[round]!.map((r) => `| ${r.charter} | ${r.agent} | ${r.ended} | ${r.steps} | ${r.findings.filter((f) => f.kind === 'issue').length} | ${r.findings.filter((f) => f.kind !== 'issue').length} | ${r.ai} | ${r.duration} |`),
    '',
    '## Findings (unverified until a repro test fails)',
    '',
    '| Charter | Severity | Finding | Expected | Actual | Planted bug? |',
    '| --- | --- | --- | --- | --- | --- |',
    ...all[round]!.flatMap((r) => r.findings.map((f) =>
      `| ${r.charter} | ${f.kind === 'issue' ? SEVERITY[f.severity] : 'warning'} | ${f.title} | ${f.expected.replace(/\|/g, '/')} | ${f.actual.replace(/\|/g, '/')} | _triage_ |`)),
    '',
  ];
  writeFileSync(resolve(env.root, `docs/bugbash/${date}-${round}.md`), md.join('\n'));
  console.log(md.slice(0, 8 + charters.length).join('\n'));
}

writeFileSync(resolve(env.root, `docs/bugbash/${date}-results.json`), `${JSON.stringify({ date, bugs, rounds: all }, null, 2)}\n`);
await closeDb();
console.log(`\nWrote docs/bugbash/${date}-*.md. Evidence (screenshots, videos) is under .e2e/bugbash/.`);
