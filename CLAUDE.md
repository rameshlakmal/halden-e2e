# Halden E2E: rules for this repo

Agentic end-to-end tests for Halden Outfitters, built with the `e2e` runner (`@e2e-dev/web` on Playwright), run against the shop's own dev server on a local, disposable Postgres database that is reseeded before every test.
These rules apply to people and agents alike. `npm run typecheck` enforces some; the `reviewer` agent checks the rest. Change a rule here first, then the code.

End-to-end tests use e2e; read `node_modules/e2e/skills/e2e/SKILL.md` before writing or running one.

---

## 1. How work flows: the `/qa` command
All QA work on a feature runs through `/qa <feature> <stage>` (`.claude/skills/qa/SKILL.md`) and lives in one feature folder. The full guide is `docs/AGENTIC-QA.md`.

| Stage | Who | Writes |
|---|---|---|
| `intake` | lead | `feature.md`, `decisions.md` |
| `explore` | QA team: functional-tester, explorer, mobile-ui, tablet-ui, desktop-ui (optionally blind, with planted bugs on) | `.evidence/<feature>/<date>/`; the lead merges into `feature.md`, `findings.json` |
| `automate` | test-analyst → (user approves) → automation-engineer → reviewer → failure-triager | `testplan.md`, page objects, fixtures, specs |
| `backfill` | spec-builder → (user answers) → the automate pipeline | an existing feature with no PR |
| `retest` | lead or functional-tester | `findings.json` statuses |
| `status`, `coverage` | lead | nothing |

File ownership and the order of trust: `.claude/skills/qa/reference/feature-folder.md`.
**Agents never run git writes.** The user reviews and commits.

Two kinds of agent live in this repo, on purpose:
- **Runtime agents** (`agents/personas.ts`): the models *inside* the tests and `e2e explore` (`agent.act`, the bug-bash personas). They drive the shop.
- **Claude Code agents** (`.claude/agents/`): the QA team that specifies, explores, plans, writes, reviews and triages. They drive the runtime agents, the runner and the shop through the `e2e` MCP server.

---

## 2. Project structure
```
halden-e2e/
├── .claude/                agents, the /qa skill and its scripts (committed; settings.local.json is not)
├── .mcp.json               the e2e MCP server for the Claude agents (e2e.qa.config.ts, one session per agent)
├── .e2e/                   runner output (never committed) except cache/ (committed: CI replays it)
├── .evidence/              QA run evidence (never committed)
├── agents/personas.ts      runtime agents: the test agent and the explorer personas
├── tools/shop-tools.ts     project tools that give a runtime agent eyes in the database
├── fixtures/fixtures.ts    every fixture: the shop, page objects, the shopper flow; exports test and expect
├── pages/                  page objects (*.page.ts) and flows (*.flow.ts)
├── tests/
│   ├── auth.setup.e2e.ts   saves the sessions (shopper, jonas, ari, admin); no test logic
│   ├── <feature>/          one folder per feature, never nested deeper
│   │   ├── feature.md, decisions.md, findings.json, testplan.md   (the /qa feature folder)
│   │   └── <feature>.<role>.e2e.ts
│   └── bugbash/            repro tests for open bugs; outside the gating run
├── utils/                  env, seed data and price rules (shop-data.ts), database access, sign-in
├── bugbash/charters.txt    the runtime personas' bug-bash charters
├── e2e.config.ts           the suite · e2e.qa.config.ts the QA team's device targets · e2e.bugbash.config.ts
└── scripts/                db-create, bug-matrix, bugbash, with-env
```

---

## 3. Roles and sessions
| Role | Spec suffix | Session (`describe` option) | Account |
|---|---|---|---|
| guest | `.guest.e2e.ts` | none | none |
| shopper | `.shopper.e2e.ts` | `{ session: 'shopper' }` | maya@halden.test |
| admin | `.admin.e2e.ts` | `{ session: 'admin' }` | admin@halden.test |

- Sessions are saved by `tests/auth.setup.e2e.ts`, which signs in through the shop's API (a cookie), so screenshots stay available to the agent. `jonas` and `ari` exist for parallel explorers.
- Role comes from the file suffix and the session. Never sign in inside a test.
- Passwords live only in `.env` (local) and GitHub secrets (CI); the config declares them as `credentials`. Keep `.env.example` in sync.
- `workers: 1` is deliberate: every test reseeds the one shared database.
- The QA team's MCP sessions and `npx e2e run` both start the shop on port 3199: close MCP sessions before running the suite.

---

## 4. Page objects
**Page objects describe a page and name its checks; specs tell the business scenario.**

- One class per page or region in `pages/<name>.page.ts`, constructed from `(app, screen)` in `fixtures/fixtures.ts`, never in a spec. Multi-page journeys are flows (`pages/shopper.flow.ts`).
- Locators are `private readonly`, set in the constructor, or private methods for dynamic ones (`orderRow(id)`).
- `open()` waits until the page is usable (`locator.waitFor({ state: 'visible' })`).
- Actions wait for their own effect (the dialog closed, the notice shown) before returning.
- Named expectations (`expectTotals`, `expectCharged`, `expectCouponRefused`) hold the screen-specific assertions so specs read as the scenario. They take expected values as arguments; they never compute them.
- Comments explain *why* (the `<output>` that is a second `status`, the dialog's second button), never *what*.

### Locators: use the first that works
1. `screen.getByRole(role, name)`
2. `screen.getByLabel()`
3. `screen.getByPlaceholder()`
4. `screen.getByText()` (non-interactive text only)
5. `screen.getByTestId()`: the shop has no test-id habit; if nothing semantic works, add a `LOCATOR` row to `decisions.md` asking for an accessible name
6. CSS: last resort, with a comment saying why. XPath: never.

Narrow with chaining and `.filter({ hasText })`; a locator that matches two nodes fails with `LOCATOR_AMBIGUOUS`, so fix the locator, never pick an index to silence it. Check new locators against the live shop with the MCP `locate` tool before writing them.

### Waiting
No sleeps, ever. Locators resolve when used, actions wait for readiness, `expect` retries. Reads (`textContent()`, `count()`) answer at once: use a matcher when a value must settle.

---

## 5. Specs
- Import `test` and `expect` only from `../../fixtures/fixtures.ts`.
- **Expected money comes from `expectedTotals()`** in `utils/shop-data.ts`, written from the shop's documented price rules and independent of its code, so it can disagree with it. Seed values come from `PRODUCTS`, `COUPONS`, `CARDS`, `ADDRESS`. Never copy a number from the screen into a test.
- **One behaviour per test.** If the title needs "and", split it (journeys in `tests/journeys/` are the exception). Tests never depend on each other.
- **Title:** `Verify that <who> <does what or what state the page is in> <and what they should see>`, in the shop's words ("Discount code", "Cancel order"), no internal names or IDs.
- **Tags** on every test or its `describe`:
  - the feature and role (`coupons`, `guest`), set on the `describe`;
  - the priority `P0` / `P1` / `P2` and `case:<ID>` from `testplan.md`;
  - `flow:<FLOW-ID>` for each flow in `.claude/skills/qa/reference/feature-flows.json` it covers (coverage counts these);
  - `bug:<key>` when it guards a planted bug (the bug matrix reads these);
  - `agent` when it has agent steps; `smoke` for the fast subset.
- **Agent steps** (`agent.act`, `agent.assert`): one goal per call, in the screen's words, real values in `params`, and an exact `expect` right after. The check is what fails when the agent did the wrong thing, and what lets the replay cache record the step. Default to deterministic steps; use the agent where the path legitimately varies.
- **Secrets** only through `credentials` and `secrets` in the config; never literal.
- **Known bugs:** an open bug's repro test lives in `tests/bugbash/<feature>-<finding-id>.e2e.ts`, tagged `bugbash`, asserting the correct behaviour (it fails until the fix), only after the user approved it (a `BUG` row). `e2e.config.ts` excludes `tests/bugbash/` from the gating run. When the fix lands, it moves into the feature folder as a normal test. Never `skip` a bug.

---

## 6. Fixtures and data
- All fixtures live in `fixtures/fixtures.ts`.
- The `shop` fixture reseeds the database and switches on this run's planted bugs (`HALDEN_BUGS`) before each attempt, so tests create whatever they need and never clean up. `HALDEN_DB_RULES=1` makes the shop's business rules (`qa/rules.sql`) a second oracle after every test.
- Never assert on data another test created. Seeded data the tests rely on is in `utils/shop-data.ts` and the feature's `feature.md` **Test data**.

---

## 7. Safety
- Only the local test database: `utils/shop-db.ts` refuses a remote `DATABASE_URL`, because the shop's seed drops every table.
- Never edit the shop repo (`$HALDEN_SHOP_DIR`), `.env`, or `.e2e/cache/` by hand. The cache is written by verified runs only.
- Never print `.env` values or session cookies.

---

## 8. Done means
1. The case is in `testplan.md` with an ID, priority and a sourced expected result.
2. `npm run typecheck` passes.
3. The test passes locally and passes `--repeat-each 3` (with `--no-cache` when it has agent steps).
4. It can fail: changing the expected value, skipping the action, and switching on the planted bug it guards each make it fail.
5. The `reviewer` agent approved it, and its agent steps are recorded in `.e2e/cache/` for CI.

---

## 9. CI (`.github/workflows/e2e.yml`)
- Typecheck gates the e2e job. The suite runs with `--strict-cache`: agent steps replay from the committed cache, and a recording that no longer replays fails the run instead of quietly paying for the model.
- The nightly run adds the bug matrix (`npm run bug-matrix` → `docs/bug-matrix.md`).
- Secrets only in GitHub secrets; names match `.env.example`.
