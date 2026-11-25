# Decisions: <feature name>

Everything that needs the user, in one place. Agents add rows to **Open**; the user writes the answer; the `/qa` lead applies it and moves the row to **Resolved**.

Types:
- `QUESTION`: sources disagree or are silent (a tester's Q-xx)
- `TRIAGE`: keep or drop a finding after an explore run
- `PLAN`: approve the test plan before any code is written
- `ASSERTION`: an expected value or assertion should change
- `BUG`: confirm a suspected app bug, and whether its repro test ships as a known failure in `tests/bugbash/`
- `LOCATOR`: an element with no accessible role, label or text; ask the shop's developers for one
- `BASELINE`: (backfill) accept today's behaviour where code, rules and docs are silent; accepted items become `[answer]` rows and Characterization tests

## Open
| ID | Type | Raised by | Date | Item | Options / recommendation | Answer |
|---|---|---|---|---|---|---|

## Resolved
| ID | Type | Item | Answer | Applied to | Date |
|---|---|---|---|---|---|
