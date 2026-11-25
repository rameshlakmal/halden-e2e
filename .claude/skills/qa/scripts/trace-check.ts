// Usage: node .claude/skills/qa/scripts/trace-check.ts <feature> [--json]
// Spec-to-plan traceability for /qa. Read-only. Exit 0 = the plan traces the whole spec.
//
// Flow coverage (coverage.ts) can read 100% while whole behaviours have no test, because one case marks a
// flow covered. This check works one level lower: every row in feature.md "Agreed behaviour" (E-xx) must
// appear in testplan.md "## Spec traceability", split into its checkable clauses, each with a case or a reason.
//
// Exit 1 and list every problem when:
//   - an E-row in feature.md has no traceability row (untraced);
//   - a clause has status Gap, or Partial without a reason;
//   - a Covered/Planned clause names no case ID, or a case ID missing from the plan's case table;
//   - a Pushed lower / Won't automate / Blocked clause has no reason (or D-xx);
//   - "## Spec traceability" or "## Entity matrix" is missing.
// The test-analyst runs it as its last step; the lead runs it at the plan gate and shows the output.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { args, cells, readText, rel, ROOT, section } from './lib/qa.ts';

const a = args();
const slug = a._[0];
if (!slug) {
  console.error('Usage: node .claude/skills/qa/scripts/trace-check.ts <feature> [--json]');
  process.exit(2);
}

const read = (name: string) => {
  const file = join(ROOT, 'tests', slug, name);
  if (!existsSync(file)) {
    console.error(`Missing ${rel(file)}`);
    process.exit(2);
  }
  return readText(file);
};
const feature = read('feature.md');
const plan = read('testplan.md');

const specRows: { id: string; area: string; text: string }[] = [];
for (const line of (section(feature, 'Agreed behaviour') ?? '').split('\n')) {
  const m = /^\|\s*(E-\d+[a-z]?)\s*\|/.exec(line);
  if (m) {
    const c = cells(line);
    specRows.push({ id: m[1]!, area: c[1] ?? '', text: (c[2] ?? '').slice(0, 110) });
  }
}

const caseIds = new Set<string>();
for (const line of plan.split('\n')) {
  const m = /^\|\s*([A-Z]+-\d{3})\s*\|/.exec(line);
  if (m) caseIds.add(m[1]!);
}

interface Problem { kind: string; id?: string; detail: string }
const problems: Problem[] = [];
const traceSec = section(plan, 'Spec traceability');
if (traceSec === null) problems.push({ kind: 'missing-section', detail: 'testplan.md has no "## Spec traceability" section' });
if (section(plan, 'Entity matrix') === null) problems.push({ kind: 'missing-section', detail: 'testplan.md has no "## Entity matrix" section' });

const STATUSES = ['Covered', 'Planned', 'Partial', 'Pushed lower', "Won't automate", 'Blocked', 'Gap'] as const;
const traced = new Map<string, number>();
let clauses = 0;
const byStatus: Record<string, number> = Object.fromEntries(STATUSES.map((s) => [s, 0]));

for (const line of (traceSec ?? '').split('\n')) {
  if (!/^\|\s*E-\d+/.test(line)) continue;
  const [id = '', clause = '', coveredBy = '', status = '', reason = ''] = cells(line);
  clauses++;
  traced.set(id, (traced.get(id) ?? 0) + 1);
  const st = STATUSES.find((s) => status.startsWith(s));
  const refs = coveredBy.match(/[A-Z]+-\d{3}/g) ?? [];
  if (!st) {
    problems.push({ kind: 'bad-status', id, detail: `"${clause}": status "${status}" is not one of ${STATUSES.join(', ')}` });
    continue;
  }
  byStatus[st]!++;
  if (st === 'Gap') problems.push({ kind: 'gap', id, detail: `"${clause}" has no case` });
  if (st === 'Partial' && !reason) problems.push({ kind: 'partial', id, detail: `"${clause}" is Partial with no reason; split the clause or add the missing case` });
  if ((st === 'Covered' || st === 'Planned') && refs.length === 0) problems.push({ kind: 'no-case', id, detail: `"${clause}" is ${st} but names no case ID` });
  for (const r of refs) if (!caseIds.has(r)) problems.push({ kind: 'unknown-case', id, detail: `"${clause}" names ${r}, which is not in the case table` });
  if ((st === 'Pushed lower' || st === "Won't automate" || st === 'Blocked') && !reason && !/D-\d+/.test(status)) {
    problems.push({ kind: 'no-reason', id, detail: `"${clause}" is ${st} with no reason` });
  }
}
for (const s of specRows) if (!traced.has(s.id)) problems.push({ kind: 'untraced', id: s.id, detail: `${s.area}: ${s.text}` });
const known = new Set(specRows.map((s) => s.id));
for (const id of traced.keys()) if (!known.has(id)) problems.push({ kind: 'stale', id, detail: 'traced in testplan.md but not in feature.md Agreed behaviour' });

const summary = { feature: slug, specRows: specRows.length, traced: specRows.filter((s) => traced.has(s.id)).length, clauses, byStatus, problems };

if (a.json) console.log(JSON.stringify(summary, null, 2));
else {
  console.log(`# Spec traceability: ${slug}`);
  console.log(`${summary.traced}/${summary.specRows} spec rows traced · ${clauses} clauses · ${STATUSES.map((s) => `${s} ${byStatus[s]}`).join(' · ')}`);
  if (problems.length === 0) console.log('OK: every spec row is traced and no clause is a gap.');
  else {
    console.log(`\n${problems.length} problem(s):`);
    for (const p of problems) console.log(`- [${p.kind}] ${p.id ? `${p.id}: ` : ''}${p.detail}`);
  }
}
process.exit(problems.length ? 1 : 0);
