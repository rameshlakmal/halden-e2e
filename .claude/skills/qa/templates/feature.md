# <Feature name>

Slug: `<feature>` · Stage: <intake | spec | explored | planned | automated> · Last updated: <YYYY-MM-DD>
Spec origin: <intake (PR) | backfill (no PR)> · PR: <title or link, or "none (existing feature)"> · Shop commit: <output of git -C $HALDEN_SHOP_DIR log -1 --format=%h>

The single living spec for this feature. The `/qa` lead writes it (`spec-builder` at backfill). Every stage reads it.
Source tags, strongest first: `[pr]` · `[answer]` resolved row in `decisions.md` · `[rule]` business rule (`qa/rules.sql`, the README price rules) · `[code]` shop repo, read-only · `[doc]` shop README and docs · `[app]` today's behaviour (never proof of what it should do).
Path prefix: `SHOP:` = `$HALDEN_SHOP_DIR/`.
Confidence: **H** stated or verified · **M** strongly implied · **L** assumed. An L item never becomes an expected result; it goes to `decisions.md`.

## Summary
<2–3 sentences: what the feature does and for whom.>

## Scope: screens and routes
| Route / screen | States (empty, loading, error, full, sold out, signed out) | Roles |
|---|---|---|

## Roles and permissions
| Action | Guest | Shopper (own data) | Shopper (someone else's) | Admin | Source |
|---|---|---|---|---|---|

## Agreed behaviour
| ID | Area | Behaviour (Given / When / Then) | Source | Conf. |
|---|---|---|---|---|
| E-01 | | | `[rule]` | H |

## Rules and limits
| Field / rule | Value | Source |
|---|---|---|

## Business rules that guard it (`qa/rules.sql`)
<Rule names, as `shop.ts rules` prints them, that a defect in this feature would break. The HALDEN_DB_RULES oracle checks them after every test.>

## Out of scope and known gaps
<From the PR or the user. Never reported as bugs.>

## Neighbours at regression risk
<Screens and features that share components, endpoints, totals or stock.>

## Test data
- Sessions used: <guest / shopper / jonas / ari / admin> and the state each needs
- Seed data relied on (`utils/shop-data.ts`): <products, coupons, seeded orders>
- Data tests create: <orders, edits>. The `shop` fixture reseeds before every test, so nothing needs cleanup; a test never depends on another test's data.

## Testability notes
<Locators that need care, LOCATOR requests, timing quirks, steps that should stay deterministic rather than agent-driven, anything an automation engineer must know.>

## PR description (verbatim)
<Intake: the PR as pasted. Backfill: rename this section "Sources read" and list the code paths, rule names and doc sections.>

## History
| Date | Change | By |
|---|---|---|
