# <Feature name>: E2E test plan

Living document, written by `test-analyst`, approved by the user (a `PLAN` row in `decisions.md`).
Last updated: <YYYY-MM-DD> · Spec: `feature.md` · Findings: `findings.json` · Explore runs: <dates or none>
Case IDs: `<PREFIX>-NNN`, stable for life. New cases take the next free number. A test carries its case as the tag `case:<ID>`.

## Summary
| Priority | Planned | Automated | Known failure | Blocked | Pushed lower |
|---|---|---|---|---|---|
| P0 | | | | | |
| P1 | | | | | |
| P2 | | | | | |

Priority: **P0** high impact whatever the likelihood (money, stock, permission gates, the core purchase journey, regressions for high-severity bugs) · **P1** negative paths, empty and error states, secondary journeys · **P2** rare edges, extra boundaries.

Status: `Planned` · `Automated` · `Known failure` (repro test in `tests/bugbash/`, open bug) · `Blocked` (D-xx) · `Pushed lower` (DB rule, API or unit) · `Won't automate` (reason).

## Cases
| ID | Flow | Title (business outcome) | P | Type | Technique | Spec file | Expected ← source | Status | Guards bug |
|---|---|---|---|---|---|---|---|---|---|
| CPN-001 | CPN-F01 | | P0 | Positive | Decision table | `coupons.guest.e2e.ts` | `[rule]` E-01 | Planned | `coupon_twice` |

Flow: the flow ID(s) from `reference/feature-flows.json`, comma-separated; `–` only when no flow fits, with a `QUESTION` proposing one.
Type: Positive · Negative · Edge · Permission · Regression · Characterization. Technique: EP · BVA · State transition · Decision table · Pairwise · Error guessing.
Guards bug: the planted bug key this case should catch (it becomes the `bug:<key>` tag), or empty.

### CPN-001: <title>
- **Risk:** <impact × likelihood, one line>
- **Traces to:** <E-xx> · <finding ID> · <D-xx>
- **Preconditions and data:** <session, seed products and coupons from utils/shop-data.ts>
- **Step style:** Deterministic (page objects, exact values; the default) | Agent (`agent.act` for a step that varies, always followed by an exact check)
- **Steps:**
  1. …
- **Expected:** <observable outcome; money to the cent via `expectedTotals`> ← `[source]`
- **Locators seen:** <`screen.getByRole('button', 'Apply')`, checked with `locate`>
- **Automation:** <Planned | spec file:line | known failure in tests/bugbash/ | Blocked by D-xx | Pushed lower>

## Spec traceability
Every row of `feature.md` **Agreed behaviour**, split into checkable clauses (each branch of an if/else, each role, each place an amount appears). One table row per clause. `node .claude/skills/qa/scripts/trace-check.ts <feature>` must pass before the plan goes to the user.
Status: `Covered` · `Planned` · `Partial` (reason required) · `Pushed lower` (reason) · `Won't automate` (reason) · `Blocked` (D-xx) · `Gap` (not allowed in a finished plan).
| Spec row | Clause | Covered by | Status | Reason |
|---|---|---|---|---|

## Entity matrix
Everything a user creates or changes, by action. Each cell is a case ID, `n/a` or a reason. **Seen elsewhere** = the change shows in every other place it appears (order page, Your orders, admin, product stock).
| Entity | Create | Change | Cancel / delete | Persists after reload | Seen elsewhere | Validation (one representative) |
|---|---|---|---|---|---|---|

## Planted-bug matrix
Which case should catch each planted bug that touches this feature. The reviewer proves it by running the case with `HALDEN_BUGS=<key>`.
| Planted bug | Case(s) | Proven by reviewer |
|---|---|---|

## Regression cases from findings
| Finding | Case | Finding status | How it is automated |
|---|---|---|---|

## Explore coverage
Explore runs used: <`.evidence/<feature>/<date>/`, … or "none: analyst exploration only">
| Explore item | What they checked | Result then | Plan case | Or why not |
|---|---|---|---|---|

## Recommended for lower levels (not E2E)
| Behaviour | Level (DB rule / API / unit) | Reason |
|---|---|---|

## History
| Date | Change | By |
|---|---|---|
