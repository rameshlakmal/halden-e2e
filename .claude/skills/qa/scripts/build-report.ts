// Builds a self-contained HTML report from <RUN>/findings.json (written by the lead after triage).
// Screenshots listed in each finding's `evidence` are embedded, so the file can be sent on its own.
//
// Usage: node .claude/skills/qa/scripts/build-report.ts --run <RUN> [--in findings.json] [--out report.html]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { args, ROOT } from './lib/qa.ts';

const a = args();
if (typeof a.run !== 'string') {
  console.error('Usage: build-report.ts --run <RUN> [--in findings.json] [--out report.html]');
  process.exit(2);
}
const run = a.run;
const data = JSON.parse(readFileSync(join(run, typeof a.in === 'string' ? a.in : 'findings.json'), 'utf8'));
const outFile = join(run, typeof a.out === 'string' ? a.out : 'report.html');
const BUDGET = 14 * 1024 * 1024;
let used = 0;

interface Finding {
  id: string; severity?: string; title: string; description?: string; area?: string; device?: string; account?: string;
  foundBy?: string; preconditions?: string[]; steps?: string[]; expected?: string; source?: string; actual?: string;
  fix?: string; evidence?: string[]; status?: string; plantedBug?: string | null; impact?: string; effort?: string;
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const img = (path: string) => {
  const file = [join(ROOT, path), join(run, path)].find(existsSync);
  if (!file) return `<p class="meta">Missing image: ${esc(path)}</p>`;
  const buf = readFileSync(file);
  if (used + buf.length * 1.37 > BUDGET) return `<p class="meta">${esc(path)} (not embedded: size limit)</p>`;
  used += buf.length * 1.37;
  const type = extname(file).slice(1).toLowerCase().replace('jpg', 'jpeg');
  return `<figure><img loading="lazy" alt="${esc(path)}" src="data:image/${type};base64,${buf.toString('base64')}"><figcaption>${esc(path)}</figcaption></figure>`;
};

const SEV = ['critical', 'high', 'medium', 'low'];
const findings: Finding[] = (data.findings ?? []).filter((f: Finding) => f.status !== 'dropped');
const sev = (f: Finding) => (f.severity ?? '').toLowerCase();
findings.sort((x, y) => SEV.indexOf(sev(x)) - SEV.indexOf(sev(y)));
const list = (items?: string[], ordered = false) => items?.length ? `<${ordered ? 'ol' : 'ul'}>${items.map((s) => `<li>${esc(s)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>` : '';

const card = (f: Finding) => `
<article class="card" data-sev="${esc(sev(f))}">
  <header><span class="id">${esc(f.id)}</span><span class="sev ${esc(sev(f))}">${esc(f.severity)}</span><h3>${esc(f.title)}</h3></header>
  <dl>${[['Area', f.area], ['Device', f.device], ['Account', f.account], ['Found by', f.foundBy], ['Planted bug', f.plantedBug]]
    .filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
  ${f.description ? `<p>${esc(f.description)}</p>` : ''}
  ${f.preconditions?.length ? `<h4>Preconditions</h4>${list(f.preconditions)}` : ''}
  ${f.steps?.length ? `<h4>Steps to reproduce</h4>${list(f.steps, true)}` : ''}
  ${f.actual ? `<h4>Actual</h4><p>${esc(f.actual)}</p>` : ''}
  ${f.expected ? `<h4>Expected <code>${esc(f.source)}</code></h4><p>${esc(f.expected)}</p>` : ''}
  ${f.fix ? `<h4>Suggested fix</h4><p>${esc(f.fix)}</p>` : ''}
  ${f.impact ? `<p class="meta">Impact ${esc(f.impact)} · effort ${esc(f.effort)}</p>` : ''}
  ${(f.evidence ?? []).filter((e) => /\.(png|jpe?g)$/i.test(e)).map(img).join('')}
  ${(f.evidence ?? []).filter((e) => !/\.(png|jpe?g)$/i.test(e)).map((e) => `<p class="meta">Evidence: <code>${esc(e)}</code></p>`).join('')}
</article>`;

const counts = SEV.map((s) => [s, findings.filter((f) => sev(f) === s).length] as const).filter(([, n]) => n);
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>QA report: ${esc(data.feature)}</title>
<style>
:root{--bg:#fafaf7;--fg:#1d2321;--muted:#5d6764;--card:#fff;--line:#e3e5e0;--crit:#a3201b;--high:#c2541b;--med:#9a7a12;--low:#4f6b63}
@media (prefers-color-scheme:dark){:root{--bg:#141816;--fg:#e8ebe8;--muted:#9aa5a1;--card:#1c211f;--line:#2c3330}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 system-ui,sans-serif}
main{max-width:960px;margin:0 auto;padding:32px 16px}
h1{font-size:28px;margin:0 0 4px}.meta{color:var(--muted);font-size:13px}
.verdict{border-left:4px solid var(--fg);padding:8px 16px;margin:20px 0;background:var(--card)}
.counts span{display:inline-block;margin-right:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:16px 20px;margin:16px 0}
.card header{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}.card h3{margin:0;font-size:17px;flex-basis:100%}
.id{font-family:ui-monospace,monospace;font-weight:600}.sev{font-size:12px;text-transform:uppercase;font-weight:700;letter-spacing:.04em}
.critical{color:var(--crit)}.high{color:var(--high)}.medium{color:var(--med)}.low{color:var(--low)}
dl{display:grid;grid-template-columns:max-content 1fr;gap:2px 12px;font-size:13px}dt{color:var(--muted)}dd{margin:0}
h4{margin:14px 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
figure{margin:12px 0}img{max-width:100%;border:1px solid var(--line);border-radius:4px}figcaption{font-size:12px;color:var(--muted)}
</style></head><body><main>
<h1>QA report: ${esc(data.feature)}</h1>
<p class="meta">${esc(data.date ?? '')} · run <code>${esc(run)}</code></p>
${data.verdict ? `<div class="verdict"><strong>Verdict: ${esc(data.verdict)}</strong><p>${esc(data.summary ?? '')}</p></div>` : ''}
<p class="counts">${counts.map(([s, n]) => `<span class="${s}">${n} ${s}</span>`).join('')}</p>
${data.plantedBugs ? `<p class="meta">Planted bugs switched on (blind to the testers): ${esc(data.plantedBugs.on.join(', ') || 'none')} · detected: ${esc(data.plantedBugs.detected.join(', ') || 'none')}</p>` : ''}
${findings.map(card).join('')}
${data.limits ? `<h2>Coverage and limits</h2><p>${esc(data.limits)}</p>` : ''}
</main></body></html>`;
writeFileSync(outFile, html);
console.log(`Wrote ${outFile} (${findings.length} findings, ${(used / 1024 / 1024).toFixed(1)} MB of images)`);
