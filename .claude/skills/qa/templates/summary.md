# QA summary: <feature name>

Date: <YYYY-MM-DD> · Run: `<RUN>` · HTML report: `report.html`

## Verdict: <Ship | Ship with fixes | Block>
<2–3 sentences: why>

## Planted-bug detection (blind)
Bugs switched on for this run: <keys, or "none: healthy shop">. Detected: <n>/<m>.
| Planted bug | Detected by | Finding | Seen on screen, or needed the database oracle? |
|---|---|---|---|

## Top issues
1. **<ID>** (<severity>) <title>

## Counts after triage
| Severity | Functional | Explorer | Mobile | Tablet | Desktop | Total |
|---|---|---|---|---|---|---|

Dropped at triage: <n> (recorded in `tests/<feature>/decisions.md`)

## All findings
| ID | Severity | Title | Device / account | Found by |
|---|---|---|---|---|

## Questions for the developers
- **Q-xx** ...

## Improvement suggestions (quick wins first)
- **SUG-xx** ... (impact × effort)

## Coverage and limits
- Screens × devices covered: ...
- Not covered: ...
- Devices are emulated (Playwright Chromium and WebKit), not real phones. Signed-in screens were reviewed through the sweep's screenshots; interactive sessions lose pixels after a password fill.

## Reports
`functional-report.md` · `explorer-report.md` · `mobile-ui-report.md` · `tablet-ui-report.md` · `desktop-ui-report.md` · `market-benchmark.md`
