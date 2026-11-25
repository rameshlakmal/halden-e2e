// Usage: node .claude/skills/qa/scripts/coverage.ts [--feature <slug>] [--next [n]] [--json] [--out <file.md>]
// Automation coverage for /qa coverage. Read-only (except --out).
//
// Coverage is measured against the flow inventory (reference/feature-flows.json): the user journeys worth
// testing in each feature. A flow is
//   covered  when a test in tests/** carries the tag `flow:<ID>`, or a testplan.md case that names the flow
//            has status Automated;
//   planned  when testplan.md cases name it but none is automated yet;
//   gap      when nothing names it.
// Only `e2e` flows count towards the %. `db` flows (business rules the HALDEN_DB_RULES oracle checks),
// `api` and `manual` flows are listed apart.
//
//   (no flags)        one row per feature plus totals
//   --feature <slug>  every flow of one feature, its status and what covers it
//   --next [n]        the n highest-value uncovered e2e flows (default 10)
import { writeFileSync } from 'node:fs';
import { args, featureState, loadCatalog, loadFlows, scanTests, type Flow } from './lib/qa.ts';

const a = args();
const catalog = loadCatalog();
const inventory = loadFlows();
const tests = scanTests();
const RISK_ORDER = ['checkout', 'orders', 'coupons', 'cart', 'admin', 'account', 'catalog'];
const PRIORITY = { P0: 0, P1: 1, P2: 2 } as const;

interface FlowRow extends Flow {
  status: 'covered' | 'planned' | 'gap' | Exclude<Flow['level'], 'e2e'>;
  coveredBy: string[];
}

const features = catalog.map((f) => {
  const state = featureState(f.slug);
  const flows: FlowRow[] = (inventory[f.slug]?.flows ?? []).map((flow) => {
    const byTag = tests.filter((t) => t.tags.includes(`flow:${flow.id}`)).map((t) => `${t.file} › ${t.title}`);
    const cases = state.plan.filter((c) => c.flows.includes(flow.id));
    const automated = cases.filter((c) => c.status.startsWith('Automated'));
    let status: FlowRow['status'] = 'gap';
    if (flow.level !== 'e2e') status = flow.level;
    else if (byTag.length || automated.length) status = 'covered';
    else if (cases.length) status = 'planned';
    return { ...flow, status, coveredBy: [...byTag, ...cases.map((c) => `${c.id} (${c.status})`)] };
  });
  const e2e = flows.filter((x) => x.level === 'e2e');
  const count = (s: FlowRow['status']) => flows.filter((x) => x.status === s).length;
  return {
    slug: f.slug,
    name: f.name,
    stage: state.featureMd ? (state.stage ?? 'spec') : 'no feature.md',
    e2eFlows: e2e.length,
    covered: count('covered'),
    planned: count('planned'),
    gap: count('gap'),
    p0Gap: e2e.filter((x) => x.status === 'gap' && x.priority === 'P0').length,
    other: flows.length - e2e.length,
    pct: e2e.length ? Math.round((100 * count('covered')) / e2e.length) : null,
    openDecisions: Object.values(state.openDecisions).reduce((x, y) => x + y, 0),
    openFindings: state.findings.open ?? 0,
    flows,
  };
});

const totals = features.reduce((t, f) => ({ e2e: t.e2e + f.e2eFlows, covered: t.covered + f.covered, p0Gap: t.p0Gap + f.p0Gap }), { e2e: 0, covered: 0, p0Gap: 0 });
const lines: string[] = [];

if (typeof a.feature === 'string') {
  const f = features.find((x) => x.slug === a.feature);
  if (!f) {
    console.error(`Unknown feature "${a.feature}". Known: ${features.map((x) => x.slug).join(', ')}`);
    process.exit(1);
  }
  lines.push(`# Coverage: ${f.name} (${f.slug})`, '', `${f.covered}/${f.e2eFlows} e2e flows covered (${f.pct ?? 0}%) · stage: ${f.stage} · open decisions: ${f.openDecisions} · open findings: ${f.openFindings}`, '');
  lines.push('| Flow | P | Level | Status | Journey | Covered by |', '|---|---|---|---|---|---|');
  for (const x of f.flows) lines.push(`| ${x.id} | ${x.priority} | ${x.level} | ${x.status} | ${x.name} | ${x.coveredBy.join('<br>') || '–'} |`);
} else if (a.next) {
  const n = typeof a.next === 'string' ? Number(a.next) : 10;
  const gaps = features.flatMap((f) => f.flows.filter((x) => x.level === 'e2e' && x.status !== 'covered').map((x) => ({ ...x, feature: f.slug })));
  gaps.sort((x, y) => PRIORITY[x.priority] - PRIORITY[y.priority] || RISK_ORDER.indexOf(x.feature) - RISK_ORDER.indexOf(y.feature));
  lines.push(`# Next ${n} flows to automate`, '', '| # | Flow | P | Feature | Status | Journey |', '|---|---|---|---|---|---|');
  gaps.slice(0, n).forEach((x, i) => lines.push(`| ${i + 1} | ${x.id} | ${x.priority} | ${x.feature} | ${x.status} | ${x.name} |`));
} else {
  const pct = totals.e2e ? Math.round((100 * totals.covered) / totals.e2e) : 0;
  lines.push('# Halden E2E coverage', '', `**${totals.covered}/${totals.e2e} e2e flows covered (${pct}%)** · ${totals.p0Gap} P0 gaps · ${tests.length} tests on disk`, '');
  lines.push('| Feature | Stage | E2E flows | Covered | Planned | Gap | P0 gap | DB/API/manual | % | Open decisions | Open findings |', '|---|---|---|---|---|---|---|---|---|---|---|');
  for (const f of features) {
    lines.push(`| ${f.name} (\`${f.slug}\`) | ${f.stage} | ${f.e2eFlows} | ${f.covered} | ${f.planned} | ${f.gap} | ${f.p0Gap} | ${f.other} | ${f.pct ?? '–'}% | ${f.openDecisions} | ${f.openFindings} |`);
  }
  const untagged = tests.filter((t) => !t.tags.some((tag) => tag.startsWith('flow:')) && !t.file.includes('/bugbash/') && !t.file.endsWith('auth.setup.e2e.ts'));
  if (untagged.length) lines.push('', `Tests with no \`flow:\` tag (${untagged.length}): ${untagged.map((t) => `${t.file} › ${t.title}`).join('; ')}`);
}

if (a.json) console.log(JSON.stringify({ totals, features }, null, 2));
else console.log(lines.join('\n'));
if (typeof a.out === 'string') writeFileSync(a.out, lines.join('\n') + '\n');
