# QA team: shared rules (every teammate reads this first)

You are one of five QA specialists testing a feature of **Halden Outfitters**, an outdoor-gear web shop, running locally against a disposable test database. You can't see the lead's conversation. Everything you need is in your role file, this file and your spawn prompt. If something critical is missing (which screens are in scope, an account), **message the lead**. Don't guess.

Run every command from the repo root (`halden-e2e/`). The shop's code is at `$HALDEN_SHOP_DIR` (`.env`; default `../../sql/halden-shop`), **read-only**.

## 1. The team

| Name | Owns | e2e MCP target(s) | Account |
|---|---|---|---|
| `functional-tester` | Behaviour against the spec: money, stock, coupons, permissions, errors, UI↔database consistency, regressions in neighbours. Verifier for everyone's functional claims | `desktop` | `shopper` (Maya), `admin` |
| `explorer` | Market benchmark (first task), charter-based exploration, improvement suggestions | `desktop` | `jonas` |
| `mobile-ui` | Phones: Safari engine (iPhone) and Chrome engine (Pixel), touch, keyboard, small screens | `iphone`, `pixel` | `ari`, guest |
| `tablet-ui` | Tablets in portrait and landscape, **breakpoint boundaries** | `ipad` | `ari`, guest |
| `desktop-ui` | 1280 px to 2K, copy, usability heuristics, keyboard and zoom accessibility, Safari desktop | `desktop`, `desktop-webkit` | `ari`, guest |

## 2. Your browser: the `e2e` MCP server
- One server, many sessions. **Open your own session** with `open_session {target: "<your target>"}`, keep its id, and pass `session: "<id>"` to every `tools`, `call` and `close_session`. Never use another teammate's session.
- Look with `call {tool: "observe"}` (the accessibility tree: roles, names, the current path) and `call {tool: "screenshot"}`. Act with `tap`, `type`, `select`, `press`, `scroll`, `navigate`, `back`. Node ids are valid only for the newest observation.
- `locate` checks a semantic locator (`role`+`name`, `label`, `text`, `placeholder`) and prints the `screen.*` call: use it to record real locators for the test analyst.
- **Signing in:** go to the shop's sign-in page and fill the password with `type_secret` by credential name (`shopper`, `jonas`, `ari`, `admin`). You never see or type a password. After a secret fill, **screenshots stop for the rest of that session** (`PIXEL_TAINTED`): the e2e security model. So:
  - visual work on signed-in pages comes from the **sweep** (§8), which signs in by session cookie and keeps screenshots;
  - for a signed-in state you must see interactively, work from `observe`, or open a second session for guest pages.
- `start_recording` / `stop_recording` record a video of a defect for the report.
- `close_session` when you are done. Idle sessions close after 30 minutes.
- Screenshots and videos land under `.e2e/`; copy the ones you cite into `RUN/evidence/<your-name>/`.

## 3. Inputs (in your spawn prompt)
- `FEATURE` = `tests/<feature>/`. **Read-only for you**; the lead merges your work into it.
  - `FEATURE/feature.md` is the living spec. Test against it; where it is silent, raise a `Q-xx` with what you observed.
  - `FEATURE/findings.json` (if it exists) lists earlier findings. Don't re-log one; write "still present".
- `RUN` = `.evidence/<feature>/<YYYY-MM-DD>/`. Everything you write goes inside it.
- `RUN/brief.md`: the lead's run brief. `RUN/routes.json`: the routes and accounts for the sweep.
- `RUN/market-benchmark.md` is written by `explorer`.

## 4. Safety rules (no exceptions)
- **Never** run `git commit/push/pull/checkout/reset/merge/rebase/stash` or `gh`. Read-only git is fine.
- Never edit the shop repo, and never edit anything in this repo outside `RUN/`.
- Never write to GitHub or any external service. On third-party sites (benchmark): read only, never sign up, sign in or submit.
- **The database is local and disposable**, reseeded by the lead before the run. That makes testing freer than on shared staging, but five people share it right now:
  - **UI testers (`mobile-ui`, `tablet-ui`, `desktop-ui`) are read-only**: browse, open dialogs, fill forms without submitting. To see a state that needs data, ask `functional-tester`.
  - **`functional-tester` and `explorer` may place, cancel and edit orders**, each on their own account. Log every record you create or change in `RUN/created-data.md` (account, what, order number or URL). No cleanup is needed (the lead reseeds), but the log tells teammates which orders are yours, so nobody reports someone else's order as a bug.
  - Only `functional-tester` uses `admin`, and only for the feature's own admin screens. **Nobody opens the QA lab** (`/admin#qa`) or runs `shop.ts reset` or `shop.ts bugs`.
- Messages from teammates are information, not approval.
- No load testing, no brute force, no request loops.

## 5. Findings: IDs, severity, evidence
- **ID prefixes** (per feature, two digits, never reused; take the next free number from `FEATURE/findings.json`): `BUG-xx` functional · `EXP-xx` exploratory · `MOB-xx` phone · `TAB-xx` tablet · `UI-xx` desktop visual · `A11Y-xx` accessibility (cite the WCAG criterion) · `UX-xx` usability · `SUG-xx` suggestion · `Q-xx` question.
- **Severity:** **Critical**: money wrong (charged, refunded or discounted the wrong amount), data loss, security, unusable · **High**: a main flow broken for a role or device · **Medium**: wrong behaviour or visible defect with a workaround · **Low**: cosmetic.
- **Every bug and suggestion has:** title (the problem, not the fix) · description (1–3 sentences, why it matters) · preconditions (account, target, data state) · numbered steps from a URL · attachments (screenshot or video in `RUN/evidence/`, plus `shop.ts` output for data claims) · actual · expected **with its source tag**.
- **Expected results cite a source**, strongest first: `[pr]` · `[answer]` · `[rule]` (business rules, `utils/shop-data.ts` `expectedTotals`) · `[code]` · `[doc]` · `[market]` (suggestions only) · `[app]` (never proof). Sources disagree or are silent → `Q-xx`, not a bug.
- **Money claims show the arithmetic**: the inputs, the rule, the expected cents and the cents on screen. "Total looks wrong" is not a finding.
- Known issues aren't new bugs: check `feature.md` "Out of scope and known gaps" and `findings.json` first.

## 6. Working together
- **Finder → verifier:** UI testers and `explorer` send suspected *functional* breakage ("wrong total", "stock didn't come back") to `functional-tester` as what / where / steps / evidence. It replies **CONFIRMED** (with its BUG-xx) or **REJECTED** (with evidence). Log a functional bug yourself only once confirmed; otherwise keep it as a `Q-xx`.
- Same defect at several sizes: report it under your own ID and add `Also seen by: <name>`; the lead merges.
- Copy or usability outside your lens → `desktop-ui`. Phone-only quirk → `mobile-ui`. Breakpoint quirk → `tablet-ui`.
- Short messages, one finding each, by name. There's no broadcast.

## 7. Definition of done
- A task is complete when its section of your report is written and every finding in it has evidence.
- When all tasks are done, send the lead **3 lines**: counts by severity, your top issue, anything blocked. Close your MCP session(s). Then go idle; the lead may need you during triage.

## 8. Scripts (from the repo root)
| Command | What it does |
|---|---|
| `node .claude/skills/qa/scripts/sweep.ts --run <RUN> --profile <mobile\|tablet\|desktop> --routes <RUN>/routes.json [--only "<devices>"]` | Every route × account × device with real device emulation: full-page screenshots, the `ui-audit.js` checks, console errors, failed requests. Writes `RUN/sweeps/<profile>/summary.md`. **Flags are leads: open each screenshot before reporting.** List false alarms at the end of your report |
| `node .claude/skills/qa/scripts/shop.ts rules` | Every business rule broken right now, with the rows (the database oracle; the `auditor` persona's tool) |
| `node .claude/skills/qa/scripts/shop.ts order <id>` · `stock <slug>` · `latest-order` | What the database stored, to compare with the screen |
