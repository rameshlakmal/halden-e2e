# Functional report: <feature name>

By `functional-tester` · Run `<RUN>`

## Summary
Critical <n> · High <n> · Medium <n> · Low <n> · Questions <n> · Cases <passed>/<total> · Business rules broken during the run: <rule names or "none">

## Test cases
Every case run, passes too: the test analyst turns this table into automated tests.
| ID | Area | Account | Steps (short) | Expected [source] | Actual | DB check | Result |
|---|---|---|---|---|---|---|---|
| TC-01 | | | | | | `shop.ts rules` clean / rule broken | Pass / Fail (BUG-xx) / Blocked |

## Bugs
### BUG-01: <title>
- **Severity:** <Critical/High/Medium/Low> · **Account:** <name> · **Target:** <desktop> · **Found by:** <name>
- **Preconditions:** ...
- **Steps:**
  1. ...
- **Expected** `[source]`: ... (the arithmetic for money)
- **Actual:** ...
- **Evidence:** `evidence/functional-tester/BUG-01-<slug>.png`, `shop.ts order <id>` excerpt, broken rule and rows
- **Suspected cause:** `SHOP:<path>:<line>` (optional)

## Verification log (claims from teammates and from the persona pre-pass)
| From | Claim | Verdict | Evidence / BUG ID |
|---|---|---|---|

## Questions
- **Q-xx** ...

## Data created
See `created-data.md`.
