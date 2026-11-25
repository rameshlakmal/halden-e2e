# Known-escape checklist

Kinds of bug that have reached production before. Every tester checks the items that apply to its lens on **every screen in scope, every run**, and records Pass / Fail / n.a. per item. The lead adds a row after each run when a new kind of escape is found (including bugs found later that the team missed).

Items E-01 to E-20 were carried over from an earlier web project's QA history (the *origin* column); Halden rows start at H-01.

| # | Check | Applies to | Origin |
|---|---|---|---|
| E-01 | Every page and detail view has a visible way **back or out**, not only the browser's back gesture | mobile, tablet | earlier project |
| E-02 | A half-filled form (checkout address) warns before discarding input, or keeps it | all | earlier project |
| E-03 | Touch targets are at least 24×24 px (44×44 recommended), including steppers and icon buttons | mobile, tablet | earlier project |
| E-04 | Primary actions (Pay, Apply, Check out) stay visible and reachable, including with the on-screen keyboard open | mobile, tablet | earlier project |
| E-05 | Inputs are big enough and the placeholder isn't cut off | all | earlier project |
| E-07 | Long product names are shortened on cards and in the cart, and long words don't break the layout | all | earlier project |
| E-08 | Every dialog (Cancel order confirmation) has a visible close and Escape closes it on desktop | all | earlier project |
| E-12 | Error messages are human-readable: no raw codes, status names or broken grammar | all | earlier project |
| E-13 | A broken or malformed URL (`/product?slug=nope`, `/order?id=abc`) shows a proper not-found state | all | earlier project |
| E-14 | Submitting twice (double click Pay, back and Pay again, two tabs) doesn't create two records | all (functional) | earlier project |
| E-15 | Text with `&`, `<`, quotes and accents round-trips unchanged (names, addresses) | all (functional) | earlier project |
| E-18 | Every interactive element shows a visible keyboard focus ring; dialogs move focus in and return it on close | desktop, tablet | earlier project |
| E-19 | iOS Safari doesn't zoom when an input is focused (font-size ≥ 16 px) | mobile (WebKit) | earlier project |
| E-20 | Signed-in-only content has a loading state; an expired session doesn't show someone else's data or a blank page | all | earlier project |
| E-22 | Records owned by a user check **ownership**: shopper B can't open or cancel shopper A's order by changing the id | all (functional) | earlier project |
| E-25 | Rotating or crossing a breakpoint (767/768, 1023/1024) keeps half-typed form input | all | earlier project |
| E-27 | Sticky headers, the cart badge and toasts never cover the primary button or the order summary | mobile, tablet | earlier project |
| E-28 | A failed request shows an error state, not an empty state | all (functional) | earlier project |
| H-01 | **Every amount agrees everywhere it appears**: cart summary, Pay button, order page totals, payment line ("Charged $…"), Your orders list, admin order. Recompute from the price rules, don't compare screens only with each other | all (functional) | Halden price rules; planted-bug families |
| H-02 | **History never changes when today's settings do**: after a price, stock or coupon edit in the admin, past orders show what was paid | functional | Halden admin rules |
| H-03 | **Undo is complete**: a cancel refunds the full charge, returns the stock and the coupon use | functional | Halden cancel rules |
| H-04 | Limits hold under repetition: a coupon's use limit, stock at 0 and 1, the $75 free-shipping and $150 SAVE20 boundaries, exactly at and one cent either side | functional | Halden coupon and price rules |
| H-05 | The database agrees with the screen: `shop.ts rules` shows no broken rule after each order you place, cancel or change | functional | Halden `qa/rules.sql` |
