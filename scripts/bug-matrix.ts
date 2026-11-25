// The bug detection matrix: mutation testing at the UI level.
// Runs the suite once on a healthy shop, then once per planted bug, with and without the database rules
// as a second oracle, and records which tests caught which bug. Writes docs/bug-matrix.md and .json.
//
// Usage: npm run bug-matrix                     (deterministic tests only: no model calls, no cost)
//        npm run bug-matrix -- --with-agent     (agent tests too; replays from the cache where it can)
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BUG_KEYS, env } from '../utils/env.ts';

const withAgent = process.argv.includes('--with-agent');
const modes = [
  { key: 'ui', label: 'Screen assertions', dbRules: false },
  { key: 'ui+db', label: 'Screen + database rules', dbRules: true },
] as const;
const scenarios = ['healthy', ...BUG_KEYS] as const;

interface Result {
  titlePath: string[];
  tags: string[];
  status: string;
}

function runSuite(output: string, bug: string | null, dbRules: boolean): { results: Result[]; seconds: number } {
  const args = [resolve(env.root, 'node_modules/e2e/dist/cli/bin.js'), 'run', '--output', output, '--reporter', 'junit', '--retries', '0', '--exclude-tag', 'bugbash'];
  if (!withAgent) args.push('--exclude-tag', 'agent');
  const started = Date.now();
  const run = spawnSync(process.execPath, args, {
    cwd: env.root,
    stdio: ['ignore', 'pipe', 'inherit'],
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, HALDEN_BUGS: bug ?? '', HALDEN_DB_RULES: dbRules ? '1' : '' },
  });
  const reportFile = resolve(env.root, output, 'report.json');
  if (!existsSync(reportFile)) {
    // e2e stopped before running anything (a busy port, a bad config): show why instead of a missing-file error.
    process.stderr.write(run.stdout ?? '');
    throw new Error(`e2e exited with code ${run.status} and wrote no report. Is another run using port ${env.port}?`);
  }
  const report = JSON.parse(readFileSync(reportFile, 'utf8'));
  return { results: report.run.results as Result[], seconds: Math.round((Date.now() - started) / 1000) };
}

const title = (r: Result) => r.titlePath.at(-1) ?? r.titlePath.join(' ');
const failed = (r: Result) => r.status === 'failed' || r.status === 'timed-out';
const guards = (r: Result) => r.tags.filter((t) => t.startsWith('bug:')).map((t) => t.slice(4));

const rows: Record<string, Record<string, { caughtBy: string[]; expectedBy: string[]; seconds: number; tests: number }>> = {};
for (const mode of modes) {
  for (const scenario of scenarios) {
    const bug = scenario === 'healthy' ? null : scenario;
    process.stderr.write(`\n▶ ${mode.label}: ${scenario}\n`);
    const { results, seconds } = runSuite(`.e2e/matrix/${mode.key}/${scenario}`, bug, mode.dbRules);
    const selected = results.filter((r) => r.status !== 'skipped' || failed(r));
    (rows[scenario] ??= {})[mode.key] = {
      caughtBy: selected.filter(failed).map(title),
      expectedBy: bug ? selected.filter((r) => guards(r).includes(bug)).map(title) : [],
      seconds,
      tests: selected.length,
    };
  }
}

const cell = (c: { caughtBy: string[] }, healthy: boolean) =>
  healthy ? (c.caughtBy.length === 0 ? '✅ all green' : `❌ ${c.caughtBy.length} failing`) : c.caughtBy.length > 0 ? `✅ caught by ${c.caughtBy.length}` : '❌ missed';

const lines = [
  '# Bug detection matrix',
  '',
  `Generated ${new Date().toISOString().slice(0, 10)} by \`npm run bug-matrix${withAgent ? ' -- --with-agent' : ''}\`. ` +
    'Each row switches on one planted bug in the shop\'s QA lab and runs the suite against a freshly seeded database. ' +
    `${withAgent ? 'Agent tests included.' : 'Deterministic tests only (agent tests excluded, so no model calls).'}`,
  '',
  `| Scenario | ${modes.map((m) => m.label).join(' | ')} |`,
  `| --- | ${modes.map(() => '---').join(' | ')} |`,
  ...scenarios.map((s) => `| ${s === 'healthy' ? '**Healthy shop**' : `\`${s}\``} | ${modes.map((m) => cell(rows[s]![m.key]!, s === 'healthy')).join(' | ')} |`),
  '',
  '## Which tests caught each bug',
  '',
  ...BUG_KEYS.flatMap((bug) => [
    `### \`${bug}\``,
    '',
    ...modes.flatMap((m) => {
      const c = rows[bug]![m.key]!;
      const missedGuards = c.expectedBy.filter((t) => !c.caughtBy.includes(t));
      return [
        `**${m.label}** (${c.seconds}s):`,
        ...(c.caughtBy.length ? c.caughtBy.map((t) => `- ${t}${c.expectedBy.includes(t) ? ' *(its guard test)*' : ''}`) : ['- nothing failed']),
        ...(missedGuards.length ? [`- ⚠ guard tests that did not fail: ${missedGuards.join('; ')}`] : []),
        '',
      ];
    }),
  ]),
];

mkdirSync(resolve(env.root, 'docs'), { recursive: true });
writeFileSync(resolve(env.root, 'docs/bug-matrix.md'), `${lines.join('\n')}\n`);
writeFileSync(resolve(env.root, 'docs/bug-matrix.json'), `${JSON.stringify(rows, null, 2)}\n`);
console.log(lines.slice(0, 6 + scenarios.length + 1).join('\n'));
console.log('\nFull matrix: docs/bug-matrix.md');
