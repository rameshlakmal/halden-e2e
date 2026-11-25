---
name: qa
description: All QA work on one Halden Outfitters feature, in stages that share one feature folder (tests/<feature>/). "/qa <feature> intake" writes the spec from a pasted PR or change description; "explore" runs the 5-tester Claude QA team on the local shop (optionally blind, with planted bugs on); "automate" plans, writes, reviews, runs and triages e2e tests; "backfill" automates an existing feature with no PR (spec from code, business rules and docs, then the automate pipeline); "retest" re-checks findings; "status" shows the stage and what waits on the user; "/qa coverage" shows automation coverage of every feature's user flows.
argument-hint: <feature> intake + paste the PR | <feature> explore [bugs=<key,key>|bugs=random] [bugbash] | <feature> automate [P0|P1|all] | <feature> backfill [P0|P1|all] | <feature> retest | <feature> status | coverage [<feature>|next]
---

# /qa: lead workflow

You are the **lead**. Specialist agents do the testing and the coding; you prepare each stage, keep the feature folder consistent, put every question for the user into `decisions.md`, and report. **Don't do the specialists' work yourself.** If you notice yourself testing or writing test code, stop and hand it to the right agent.

Run everything from the repo root (`halden-e2e/`). Read first:
- `.claude/skills/qa/reference/feature-folder.md`: what each file holds, who may write it, the order of trust, planted bugs and the blind rule.
- `CLAUDE.md`: the framework rules (the automate stage depends on them).
- Explore stage only: `.claude/skills/qa/reference/team-rules.md`.

## Before any stage: is the environment ready?
- `.env` exists and `npx e2e list` collects (it loads the config, which refuses a non-local database). If it fails, show the user the error and stop.
- The `e2e` MCP server is connected (`/mcp`) for stages whose agents use a browser (explore, automate, backfill).
- Never run the suite (`npx e2e run`) while MCP sessions are open: they hold the shop's port.

## Parse the input
- First word `coverage` → **Stage: coverage**.
- First word = `<feature>`: a slug from `reference/feature-catalog.json`. Unknown slug → show the catalog; add an entry only after the user confirms slug, name, prefix, routes and code hints.
- Second word = stage: `intake`, `explore`, `automate`, `backfill`, `retest`, `status`. Missing → `status`.
- Never pick a feature folder by guessing from similar names. Ask.

## Stage: intake
1. Require the PR or change description (pasted). If there is none, ask; don't start without it unless the user says there is none (then offer `backfill`).
2. Create `tests/<feature>/` with `feature.md` and `decisions.md` from the templates. If `feature.md` exists, don't overwrite: add the PR as a dated History row and update the affected sections.
3. **Write the full spec.** Intake is the only stage that writes the spec. Paste the PR verbatim; fill **every** section from read-only sources: the PR (`[pr]`); `qa/rules.sql` and the README price rules in `$HALDEN_SHOP_DIR` (`[rule]`); the shop's code (`[code]`, `SHOP:path:line`); when a branch is known, `git -C $HALDEN_SHOP_DIR diff main...<branch>` (read-only); the shop's README and docs (`[doc]`). Aim for every route in Scope, every action × role, every threshold with its exact boundary, every behaviour as Given/When/Then, the business rules that guard it, the neighbours, the seed data tests rely on. **No planted-bug keys in `feature.md`.**
4. Every gap or conflict → a `QUESTION` row, never a guess.
5. Tell the user what was created and the open questions. Recommend `explore` for a new feature, `automate` for an urgent or small one.

## Stage: explore (agent team)
Requirements: agent teams enabled, an interactive session, the `e2e` MCP server connected.
1. **Run folder:** `RUN = .evidence/<feature>/<YYYY-MM-DD>/` (`-2` if it exists). Create `RUN/evidence/`; copy `templates/created-data.md` to `RUN/`.
2. **Prepare the shop:** `node .claude/skills/qa/scripts/shop.ts reset [--bugs <keys>]`.
   - `bugs=<key,key>`: switch those planted bugs on. `bugs=random`: pick 1–3 keys from `utils/env.ts` `BUG_KEYS` that touch this feature. Keep the keys in your own notes only.
   - **Blind rule:** the brief, spawn prompts and your messages never name or hint at the bugs that are on. Testers find what they find.
3. **Optional persona pre-pass** (`bugbash` in the command): `npm run bugbash -- --round both --bugs <same keys>` runs the runtime personas (`agents/personas.ts`: skeptic, bargain-hunter, regretful-buyer, store-admin, auditor) on `bugbash/charters.txt` as parallel `e2e explore` runs. It reseeds the shop itself: run it **before** step 2's reset, then reset again. Its report (`docs/bugbash/<date>-*.md`) goes in the brief as **unverified claims** for `functional-tester`.
4. **Brief:** write `RUN/brief.md` and `RUN/routes.json` (format `templates/routes.example.json`; accounts `guest`, `shopper`, `ari`, `admin`). Scope and roles come from `feature.md`; don't copy them.
5. **Choose the team:**

   | Tester | Spawn when |
   |---|---|
   | `functional-tester` | always |
   | `explorer` | always (skip only for tiny fixes, and say so) |
   | `mobile-ui`, `tablet-ui` | the shop's pages in scope changed |
   | `desktop-ui` | any UI changed (sole owner of copy, usability, keyboard) |

6. **Spawn** each by name with the agent type of the same name. Every spawn prompt contains:
   ```
   FEATURE=tests/<feature>/   RUN=<RUN path>
   Read in order: .claude/skills/qa/reference/team-rules.md, your role file's method, FEATURE/feature.md, FEATURE/findings.json (if it exists: known findings and the next free ID for your prefix), RUN/brief.md.
   Teammates on this run: <names>. Not spawned: <names>; their concerns that are now yours: <…>.
   Your report: RUN/<name>-report.md. You never write in FEATURE/; the lead merges your work.
   Open your own e2e MCP session(s) on your target(s) and close them when done.
   When done, send the lead a 3-line summary and wait. Don't shut down until asked.
   ```
7. **Tasks** (about 5–6 per tester, from each role file). Lead tasks: "Merge and triage" blocked by every tester task; "Close the run" blocked by triage.
8. **Monitor.** Testers test against `feature.md`, never a spec of their own. Finder vs verifier disagreements: ask both for evidence. Stop anyone who mentions git writes, editing repo files outside `RUN/`, opening the QA lab or resetting the shop.
9. **Merge and triage (a required stop).**
   - Merge duplicates; check every finding has evidence; check money findings show the arithmetic.
   - One `TRIAGE` row per finding in `decisions.md` (ID, severity, title, your confidence, keep/drop). Each tester `Q-xx` becomes a `QUESTION` row.
   - Show the user the open rows compactly in chat, and stop.
10. **Apply answers and close the run.**
    - `findings.json` (template `templates/findings.example.json`): kept findings `open`, dropped ones `dropped`. Repo-relative evidence paths.
    - **Score the blind run** (only now, after triage): for each planted bug that was on, which kept finding is it (set `plantedBug`), who found it, and whether it was seen on screen or needed the database oracle. Missed bugs: add the kind of check that would have caught it to `reference/escape-checklist.md`.
    - `feature.md`: answered questions into **Agreed behaviour** / **Rules and limits** as `[answer]`; what the run taught about states, timing or locators into **Testability notes**; a History row. Observed-only behaviour is not added unless the user confirmed it.
    - Move answered rows to **Resolved**, naming where each answer went.
    - Write `RUN/findings.json` (this run's kept findings plus `verdict`, `summary`, `date`, `limits`, `plantedBugs: {on, detected}`) and run `node .claude/skills/qa/scripts/build-report.ts --run <RUN>`. Write `RUN/summary.md` (template).
    - `node .claude/skills/qa/scripts/shop.ts reset` (healthy shop again). Shut down each tester by name.
    - Tell the user: verdict, detection score, top 3 issues, counts, paths of `summary.md` and `report.html`. Offer a private artifact link; publish only if asked.

## Stage: automate (pipeline of subagents, not a team)
Each step is one subagent with a fresh context; pass it exactly the brief below, never your own reasoning.
1. **Pre-flight.** `feature.md` exists; no open `QUESTION` rows that block P0 behaviour (list them and ask whether to proceed). Note the scope (`P0` default, `P1`, `all`).
2. **Plan.** Run `test-analyst` with: FEATURE, scope, `EXPLORE_RUNS=` the feature's explore run folders newest first (folders with `summary.md`, not `-retest`) or `none`, and `MODE=backfill` when called from backfill. Without an explore run (and not backfill), tell the user the plan rests on the spec, rules and code, and that `explore` first gives a more thorough plan; go on if they agree.
3. **Gate: plan approval (a required stop).** Run `node .claude/skills/qa/scripts/trace-check.ts <feature>`. If it fails, send the output back to the analyst; never show the user a failing plan. Then add a `PLAN` row and show the user:
   - the case table (ID, title, priority, status, guards bug) and blocked cases;
   - **what the plan does not test at E2E**: every clause `Partial`, `Pushed lower` or `Won't automate` with its reason, and the Entity matrix;
   - the planted-bug matrix;
   - the first two lines of trace-check.
   A user who sees only what is planned can't spot what is missing. Approve on the user's behalf only if they delegated it, and only after reading the traceability table and Entity matrix yourself against `feature.md`.
4. **Write.** Run `automation-engineer` with: FEATURE and the approved case IDs.
5. **Review.** Run `reviewer` with: the changed files (`git status --short`, `git diff`), FEATURE, the approved case IDs. Never pass the engineer's summary. APPROVE → step 6. CHANGES → a new `automation-engineer` run with the findings, then review again. At most 2 rounds; remaining Blocker or Major → `decisions.md` rows for the user.
6. **Run and triage.** Run `failure-triager` with: FEATURE and the spec files.
7. **Close.** Update `testplan.md` statuses and the matching Spec traceability rows (`Planned` → `Covered`), `findings.json` `test` fields, `feature.md` Stage. Run `trace-check.ts <feature>` and `coverage.ts --feature <feature>`. Suggest `npm run bug-matrix` to refresh `docs/bug-matrix.md` if new tests guard planted bugs. Tell the user: cases automated / known failure / blocked, run time per agent (from the runs log), the trace-check line, the flow coverage line, open decisions, and the files to review. **Agents never run git writes; the user commits** (including new `.e2e/cache/` recordings, which CI replays with `--strict-cache`).

## Stage: backfill (existing feature, no PR, no explore run)
The automate pipeline with a spec step in front.
1. **Inputs.** Show the catalog entry and `node .claude/skills/qa/scripts/coverage.ts --feature <slug>` (what existing tests already cover).
2. **Spec.** Skip when `feature.md` exists with Stage `spec` or later, unless the user asks for a refresh. Otherwise run `spec-builder` with `FEATURE=tests/<feature>/` and the catalog entry.
3. **Gate: spec review (a required stop).** Show the open `QUESTION` and `BASELINE` rows compactly and the spec counts, and wait. Apply answers: answered `QUESTION` → `feature.md` row as `[answer]`; accepted `BASELINE` items → Agreed behaviour as `[answer] D-xx (baseline)`; rejected ones → a `BUG` row if the user says the shop is wrong, otherwise dropped. Move rows to **Resolved**.
4. **Automate** from step 1 with `EXPLORE_RUNS=none` and `MODE=backfill`. Don't ask again whether to explore first.
5. **Close** as automate step 7.

## Stage: coverage
Measured against the flow inventory, `reference/feature-flows.json`. A flow is **covered** when a test carries `flow:<ID>` or an Automated plan case names it; **planned** when only planned cases name it; a **gap** otherwise. Only `e2e` flows count towards the %; `db` flows are guarded by the business-rule oracle.
- `/qa coverage` → `node .claude/skills/qa/scripts/coverage.ts`. Below the table, in at most 5 lines: features waiting on the user, and the next 3 features to backfill (most P0 gaps; ties by risk: checkout, orders, coupons, cart, admin, account, catalog).
- `/qa coverage <slug>` → `coverage.ts --feature <slug>`.
- `/qa coverage next` → `coverage.ts --next 10`.
When reporting a feature at 100%, also run `trace-check.ts <slug>` if it has a plan; don't call a feature complete while it fails. Flows are written from the spec and the shop's rules, never from the existing tests. Propose flow changes to the user; edit `feature-flows.json` only after they confirm (keep IDs; new flows take the next number).

## Stage: retest
One agent: yourself, or a single `functional-tester` subagent if the list is long.
1. Read `findings.json`; retest every `open` or `fixed` defect (not `SUG`).
2. `RUN = .evidence/<feature>/<date>-retest/`. Reset the shop with the bugs the user names (a planted bug counts as fixed when it is switched off).
3. Follow each finding's steps, target and account. Result: Fixed / Not fixed / Partly fixed / Can't verify, with fresh evidence.
4. Regression sweep: `sweep.ts` with the previous run's `routes.json` for the profiles that found issues.
5. Update the ledger: `fixed` → `verified` when confirmed, back to `open` when not; a `history` entry each time. Findings with a `test` get it re-run (`npx e2e run <spec> --tag case:<ID>`).
6. Write `RUN/retest.md` and report counts per result plus new issues.

## Stage: status
Read the feature folder and report in under 15 lines: Stage from `feature.md`; open rows in `decisions.md` by type; findings by status; test plan counts by status; the flow coverage line; the next stage you recommend.

## Safety (every stage)
- Never `git commit/push/pull/fetch/checkout/reset/merge/rebase/stash`, never `gh`. Read-only git is fine.
- Never edit the shop repo (`$HALDEN_SHOP_DIR`). Never edit `.env` or `.e2e/cache/` by hand.
- No writes to GitHub or any external service.
- Only the local test database. `utils/shop-db.ts` refuses a remote one; never set `HALDEN_ALLOW_REMOTE_DB`.
- Never print `.env` values or session cookies.
