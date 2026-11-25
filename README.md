# Halden E2E

**Agentic end-to-end testing for [Halden Outfitters](https://github.com/rameshlakmal/halden-outfitters), an outdoor-gear web shop built as a QA target, with a team of ten Claude Code agents that does the QA engineering around the tests.**

Two layers of AI, kept apart on purpose:

- **In the tests:** the [`e2e`](https://www.npmjs.com/package/e2e) runner's agents drive the shop where a path legitimately varies (`agent.act('find the Ember Stove and add one to the cart')`), every step is pinned by an exact assertion, and verified steps replay from a committed cache so CI makes no model calls.
- **Around the tests:** a `/qa` workflow in Claude Code with ten specialised agents that write the spec, explore the shop on five device targets in parallel, plan by risk, write the tests, review them independently, and triage failures, with a human approving every decision that matters.

→ **Read the guide: [docs/AGENTIC-QA.md](docs/AGENTIC-QA.md)**

## Highlights

| | |
|---|---|
| **Money to the cent** | Expected totals come from `expectedTotals()`, written from the shop's documented price rules and independent of its code, so the tests can disagree with the shop |
| **Two oracles** | Screen assertions, plus the shop's SQL business rules checked after every test (`HALDEN_DB_RULES=1`) |
| **Proven to fail** | Five planted bugs, each caught by the suite: [`docs/bug-matrix.md`](docs/bug-matrix.md). Every new test must fail when its value is flipped, its action skipped, and its planted bug switched on |
| **Blind QA runs** | The agent team can explore a shop with hidden planted bugs and gets a detection score |
| **Coverage that doesn't flatter** | Measured against a flow inventory written from the spec, not from the tests: `node .claude/skills/qa/scripts/coverage.ts` |
| **Guardrails** | Agents can't commit, can't edit the replay cache or `.env`, can't change an expected value, can't loosen an assertion to make a test pass |

## The agents

| Explore team (parallel) | Automate pipeline (sequential, fresh context each) |
|---|---|
| `functional-tester`: behaviour, money, permissions, the team's verifier | `spec-builder`: spec for an existing feature from code, rules and docs |
| `explorer`: market benchmark, charters, improvement ideas | `test-analyst`: what to test, by risk, every expected result sourced |
| `mobile-ui`: phones, touch, keyboard | `automation-engineer`: page objects and tests; never changes expectations |
| `tablet-ui`: tablets and breakpoint boundaries | `reviewer`: independent review, proves each test can fail |
| `desktop-ui`: desktop, copy, usability, accessibility | `failure-triager`: fixes locators and timing, escalates everything else |

## Quick start

```bash
npm ci
cp .env.example .env                      # local Postgres, shop checkout, OpenRouter key
npm run db:create
npx @e2e-dev/web install chromium webkit
npm run test:smoke
```

| Command | Does |
|---|---|
| `npm run test:e2e` | The whole suite |
| `npm run test:db` | The suite with the business-rule oracle after every test |
| `npm run bug-matrix` | Runs the suite once per planted bug and writes `docs/bug-matrix.md` |
| `npm run bugbash` | The runtime personas explore the shop in parallel with planted bugs on |
| `/qa coverage` (Claude Code) | Flow coverage across the shop |
| `/qa <feature> backfill` (Claude Code) | Spec, plan, tests, review and triage for an existing feature |
| `/qa <feature> explore bugs=random` (Claude Code) | A blind five-agent QA run |

## Repository map

```
.claude/agents/         the ten Claude Code agents
.claude/skills/qa/      the /qa lead workflow, its references, templates and scripts
agents/personas.ts      the runtime agents (test agent, bug-bash personas)
tests/                  e2e specs by feature; tests/<feature>/ also holds the feature's spec, plan and decisions
pages/ fixtures/ utils/ page objects, fixtures, seed data and price rules, database access
CLAUDE.md               the rules every test follows
docs/AGENTIC-QA.md      the guide
```

MIT licensed.
