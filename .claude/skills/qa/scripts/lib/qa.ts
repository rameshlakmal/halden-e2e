// Shared helpers for the /qa scripts: repo paths, CLI args, Markdown tables, the feature catalog,
// the flow inventory and what each feature folder holds. Read-only; never prints secrets.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/** scripts/lib → scripts → qa → skills → .claude → repo root */
export const ROOT = resolve(import.meta.dirname, '../../../../..');
export const QA_DIR = resolve(ROOT, '.claude/skills/qa');
export const rel = (p: string) => relative(ROOT, p).replace(/\\/g, '/');

export interface Args {
  _: string[];
  [flag: string]: string | boolean | string[];
}

/** `--flag value`, `--flag` (true) and positional words. */
export function args(argv = process.argv.slice(2)): Args {
  const out: Args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (!a.startsWith('--')) {
      out._.push(a);
      continue;
    }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[a.slice(2)] = true;
    else {
      out[a.slice(2)] = next;
      i++;
    }
  }
  return out;
}

export const readText = (file: string) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

/** The body of `## <heading>` up to the next `## ` heading. */
export function section(md: string, heading: string): string | null {
  const re = new RegExp(`^## ${heading}[^\\n]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm');
  return re.exec(md)?.[1] ?? null;
}

/** The cells of one Markdown table row. */
export const cells = (line: string) => line.split('|').slice(1, -1).map((c) => c.trim());

// ---------- catalog and flow inventory ----------

export interface CatalogEntry {
  slug: string;
  name: string;
  prefix: string;
  routes: string[];
  roles: string[];
  tests: string[];
  codeHints: string[];
}

export interface Flow {
  id: string;
  name: string;
  priority: 'P0' | 'P1' | 'P2';
  roles: string[];
  level: 'e2e' | 'api' | 'db' | 'manual';
  note?: string;
  source?: string;
}

export function loadCatalog(): CatalogEntry[] {
  return JSON.parse(readText(join(QA_DIR, 'reference/feature-catalog.json'))).features;
}

export function loadFlows(): Record<string, { flows: Flow[] }> {
  return JSON.parse(readText(join(QA_DIR, 'reference/feature-flows.json'))).features;
}

// ---------- tests on disk ----------

export interface TaggedTest {
  file: string;
  title: string;
  tags: string[];
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(join(dir, d.name)) : d.name.endsWith('.e2e.ts') ? [join(dir, d.name)] : []);
}

/**
 * Every test with its real tags, as the runner collects them (`e2e list`: tags built in loops included).
 * Falls back to a static read of the test files when the config can't load (no .env, say).
 */
export function scanTests(): TaggedTest[] {
  const list = spawnSync(process.execPath, [join(ROOT, 'node_modules/e2e/dist/cli/bin.js'), 'list', '--config', 'e2e.config.ts'], {
    cwd: ROOT, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' }, timeout: 120_000,
  });
  if (list.status === 0) {
    // tests/cart/cart.guest.e2e.ts › Cart totals › Verify that … [chromium] #cart #guest #P0 #flow:CART-F01
    return list.stdout.split('\n').flatMap((line) => {
      const m = /^(\S+\.e2e\.ts) › (.+?) \[[^\]]+\]((?: #\S+)*)\s*$/.exec(line.trim());
      if (!m) return [];
      return [{ file: m[1]!, title: m[2]!.split(' › ').at(-1)!, tags: m[3]!.trim().split(/\s+/).filter(Boolean).map((t) => t.slice(1)) }];
    });
  }
  return scanTestsStatic();
}

/** Tags written as string literals on a test's or its describe's options object. */
export function scanTestsStatic(): TaggedTest[] {
  const out: TaggedTest[] = [];
  for (const file of walk(join(ROOT, 'tests'))) {
    const src = readText(file);
    const describeTags = [...src.matchAll(/describe\(\s*['"`][^'"`]+['"`]\s*,\s*\{[^}]*tags:\s*\[([^\]]*)\]/g)]
      .flatMap((m) => strings(m[1]!));
    // test('title', { tags: [...] }, ...) or test(\n 'title',\n { tags: [...] }
    for (const m of src.matchAll(/\btest\(\s*(['"`])((?:(?!\1).)+)\1\s*,\s*(\{[^{}]*\})?/gs)) {
      const own = m[3] ? strings(/tags:\s*\[([^\]]*)\]/.exec(m[3])?.[1] ?? '') : [];
      out.push({ file: rel(file), title: m[2]!, tags: [...new Set([...describeTags, ...own])] });
    }
  }
  return out;
}

const strings = (list: string) => [...list.matchAll(/['"`]([^'"`]+)['"`]/g)].map((m) => m[1]!);

// ---------- one feature folder ----------

export interface PlanCase {
  id: string;
  flows: string[];
  title: string;
  priority: string;
  status: string;
}

export interface FeatureState {
  folder: boolean;
  featureMd: boolean;
  stage: string | null;
  plan: PlanCase[];
  openDecisions: Record<string, number>;
  findings: Record<string, number>;
  exploreRuns: string[];
}

export function featureState(slug: string): FeatureState {
  const dir = join(ROOT, 'tests', slug);
  const file = (f: string) => join(dir, f);
  const state: FeatureState = { folder: existsSync(dir), featureMd: existsSync(file('feature.md')), stage: null, plan: [], openDecisions: {}, findings: {}, exploreRuns: [] };
  if (state.featureMd) state.stage = /Stage:\s*([a-z]+)/.exec(readText(file('feature.md')))?.[1] ?? null;

  if (existsSync(file('testplan.md'))) {
    const cases = section(readText(file('testplan.md')), 'Cases') ?? '';
    for (const line of cases.split('\n')) {
      if (!/^\|\s*[A-Z]+-\d{3}\s*\|/.test(line)) continue;
      // | ID | Flow | Title | P | Type | Technique | Spec file | Expected ← source | Status | Links |
      const c = cells(line);
      state.plan.push({ id: c[0]!, flows: (c[1] ?? '').match(/[A-Z]+-F\d+/g) ?? [], title: c[2] ?? '', priority: c[3] ?? '', status: c[8] ?? '' });
    }
  }

  if (existsSync(file('decisions.md'))) {
    const open = section(readText(file('decisions.md')), 'Open') ?? '';
    for (const line of open.split('\n')) {
      const m = /^\|\s*D-\d+\s*\|\s*([A-Z]+)\s*\|/.exec(line);
      if (m) state.openDecisions[m[1]!] = (state.openDecisions[m[1]!] ?? 0) + 1;
    }
  }

  if (existsSync(file('findings.json'))) {
    for (const f of JSON.parse(readText(file('findings.json'))).findings ?? []) state.findings[f.status] = (state.findings[f.status] ?? 0) + 1;
  }

  const evidence = join(ROOT, '.evidence', slug);
  if (existsSync(evidence)) {
    state.exploreRuns = readdirSync(evidence, { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^\d{4}-\d{2}-\d{2}(-\d+)?$/.test(d.name) && existsSync(join(evidence, d.name, 'summary.md')))
      .map((d) => `.evidence/${slug}/${d.name}/`)
      .sort()
      .reverse();
  }
  return state;
}
