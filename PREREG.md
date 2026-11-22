# PREREG — pass bars written BEFORE the tests ran

Method (borrowed in spirit from Shelf Check's pre-registration): the bars below
were written and hashed before `node scripts/hw_tests.js` was executed for the
first time. Results are recorded in `results.md`, whatever they say.

**Bars:**

1. **All 16 engine tests pass.** Zero failures allowed; a failure means fix the code and re-run, recording every run.
2. **USGS round-trip:** `parseUSGS` must return all 6 embedded gauges, with site `01379000` (Passaic River near Millington NJ) at gage height **4.82 ft** and site `01311500` (Valley Stream at Valley Stream NY) at **1.05 ft** — the values in the embedded snapshot taken 2026-11-22 18:23 UTC.
3. **Trend math exact:** rising fixture `1.0 → 3.1` = **+2.10 rising**; falling `4.0 → 3.16` = **−0.84 falling**; `+0.02` = **flat** (noise threshold 0.05 ft).
4. **Validation:** a plan with no contact fails with errors on name and phone; `201-555-0134` is a valid phone; `12345` and `(555)` are rejected (10–15 digit rule).
5. **Sparklines:** every one of the 6 snapshot series produces a path string starting with `M`, containing ` L`, and containing **no `NaN`**.
6. **Plan text:** contains the contact line, the shutoff list, `Turn Around, Don't Drown`, and the 911 line; and omits the MEETING PLACE line when it is blank.
7. **Empty-state honesty:** `parseNWS({})` and `parseUSGS(null)` return empty arrays — no crash, no invented data.

SHA-256 of this file at bar-writing time:
7ddb8c78a149005bb7556ec4da7b46dbc2cf80bde51a236456a365aceac8d3fe
