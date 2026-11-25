# The feature folder: files, owners, rules

Everything about one feature lives in `tests/<feature>/` (committed) and `.evidence/<feature>/` (not committed). The slug comes from `reference/feature-catalog.json` and never changes.

```
tests/<feature>/
  feature.md                     what the feature should do: the one living spec
  decisions.md                   everything waiting on the user
  findings.json                  every finding ever logged, with its status (the ledger)
  testplan.md                    E2E cases, each traced to its source
  <feature>.<role>.e2e.ts        automated tests (role = guest | shopper | admin)
tests/bugbash/<feature>-*.e2e.ts known-failure repro tests for open bugs (outside the gating run)
.evidence/<feature>/<date>/      one folder per explore or retest run: tester reports, screenshots,
                                 sweeps, report.html (never committed)
.evidence/<feature>/<date>-runs.md, -review-<n>.md, -triage.md   automate-stage logs
```

## Who writes what
One writer per shared file, so parallel agents never overwrite each other.

| File | Written by | Read by |
|---|---|---|
| `feature.md` | the `/qa` lead at intake; `spec-builder` at backfill (extends, never deletes rows or renumbers IDs) | everyone |
| `decisions.md` | any stage adds **Open** rows; only the lead moves rows to **Resolved** after the user answers | the user, the lead |
| `findings.json` | the lead (after triage and retest); `failure-triager` may add suspected bugs as `open` | automate, retest |
| `reference/feature-catalog.json`, `reference/feature-flows.json` | the lead, after the user confirms | `coverage.ts`, analyst, spec-builder |
| `testplan.md` | `test-analyst` (the lead only updates Status cells after a run) | engineer, reviewer, triager |
| specs, `pages/`, `fixtures/`, `utils/` | `automation-engineer`; `failure-triager` for locator, wait and test-data fixes only | reviewer |
| `.evidence/<feature>/<date>/*` | each explore tester writes only its own report and evidence | the lead, `test-analyst` |
| `.e2e/cache/` | the e2e runner only (a verified agent step records itself) | CI replays it with `--strict-cache` |

Explore testers never write inside `tests/`. Nobody edits `.e2e/cache/` by hand.

## Order of trust for expected behaviour
When sources disagree, add a `QUESTION` row to `decisions.md`. Never pick one silently.

| Tag | Source | Trusted for |
|---|---|---|
| `[pr]` | the PR or change description pasted at intake | what the change is meant to do |
| `[answer]` | a resolved row in `decisions.md` | anything the user decided |
| `[rule]` | the shop's business rules: `qa/rules.sql` in `$HALDEN_SHOP_DIR`, the price rules in its README (mirrored in `utils/shop-data.ts` `expectedTotals`) | money, stock, coupons, payments: the strongest oracle this project has |
| `[code]` | the shop repo at `$HALDEN_SHOP_DIR`, read-only (`SHOP:` path prefix) | what is built: validation, limits, permissions, copy |
| `[doc]` | the shop's README and `docs/` | documented behaviour |
| `[market]` | the explorer's benchmark | suggestions only, never an expected result |
| `[app]` | today's behaviour of the running shop | exploration and locators; **never** proof of what it should do |

`SHOP_CONTEXT` in `agents/personas.ts` summarises `[doc]` for the runtime agents; cite the README or code it came from, not the constant.

## Finding lifecycle (`findings.json`)
`open` → `fixed` (developer says so, or the planted bug is switched off) → `verified` (retest confirmed) · or `dropped` (triage) · or `wontfix` (user decision).
- IDs are per feature and never reused. A tester takes the next free number for its prefix from the ledger.
- `test` names the case and spec that covers the finding (`"CPN-012 coupons.guest.e2e.ts"`). Automate skips findings that already have a test.
- `plantedBug` (lead only, after the run): the planted bug key the finding turned out to be, or `null` for a real defect. Testers never see it.
- Every status change appends to `history` with date, event and who.
- Automate turns `verified` findings into regression tests, and `open` ones into known-failure repro tests in `tests/bugbash/` only after a `BUG` decision.

## Decision rows (`decisions.md`)
IDs `D-01`, `D-02`… per feature. Types: `QUESTION`, `TRIAGE`, `PLAN`, `ASSERTION`, `BUG`, `LOCATOR`, `BASELINE`.

- `LOCATOR`: an element with no role, label or text to select by; asks the shop's developers for an accessible name (this repo has no `data-testid` habit, CLAUDE.md §4).
- `BASELINE` (backfill only): behaviour seen in the running shop that neither the code, the rules nor the docs settle, grouped per screen as `B1 …`, `B2 …`. The user accepts all, some or none. Accepted behaviours enter `feature.md` as `[answer] D-xx (baseline)` and their cases get Type `Characterization`. This is the only way `[app]` behaviour becomes an expected result.

A row is resolved only by the user. When applying an answer, write where it went ("feature.md E-07", "findings.json BUG-03 dropped").

## Planted bugs and the blind rule
The shop can switch planted bugs on (`HALDEN_BUGS`, the QA lab). An explore run may switch some on to measure the team. **Testers are never told which ones** (the brief, spawn prompts and team messages don't name them, and testers never run `shop.ts bugs` or open the QA lab). After triage, the lead maps findings to planted bugs and reports the detection score. A planted bug is a real oracle for "can this test fail": the reviewer runs new tests tagged `bug:<key>` against that bug.
