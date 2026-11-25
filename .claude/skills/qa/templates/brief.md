# Run brief: <feature name>, <YYYY-MM-DD>

Feature folder: `tests/<feature>/` (read `feature.md` for scope, roles, behaviour and known gaps) · Run folder: `<RUN>`

## Inputs for this run
- Shop: the local test shop at `http://127.0.0.1:3199`, reseeded by the lead at <time>. Shop commit: <hash>
- Extra notes from the user: <text or "none">
- Previous runs on this feature: <dates, or "none">. Open findings to watch: <IDs from findings.json>
- Runtime-persona pre-pass (`npm run bugbash`): <path to docs/bugbash/<date>-*.md, or "not run">. Its findings are unverified claims for `functional-tester` to confirm or reject.

## Accounts for this run
functional-tester: `shopper` (+ `admin` for the feature's admin screens) · explorer: `jonas` · UI testers: `ari` and guest, read-only.

## Routes for the sweep
In `<RUN>/routes.json`: the feature's routes, 1–3 neighbouring pages, and the accounts that show different states.

## Team for this run
<who was spawned and why anyone was skipped; who covers a skipped tester's concerns>
