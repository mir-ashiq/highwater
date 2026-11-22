# Test results — recorded as they happened

**Run 1 — 2026-11-22 18:41 UTC: 36 passed, 0 failed.**

`node scripts/hw_tests.js` (the engine is extracted from the shipped
`index.html` between the `/*ENGINE:START*/` / `/*ENGINE:END*/` markers, so the
tests run the exact code users get).

No code was changed after this run. PREREG.md was hashed (SHA-256
`7ddb8c78a149005bb7556ec4da7b46dbc2cf80bde51a236456a365aceac8d3fe`) before the
first execution; the bars are in that file, unedited.

What the run covered: USGS round-trip against the embedded snapshot (values,
series lengths, site names), empty/malformed-input honesty for both feeds,
exact trend math including the 0.05 ft noise threshold, phone/plan validation,
sparkline path validity for all six gauges, plan-text composition (fields
present, blank fields omitted), kit statistics and grouping, and the
LIVE / STALE / CACHED / SNAPSHOT / OFFLINE state machine.

**Run 2 — 2026-11-22 (post-inspection fixes): 46 passed, 0 failed.**

After independent inspection, the app gained two fixes and a 10-test
regression suite (R1–R10) covering them: feed verification (`validNWS` /
`validUSGS`: HTTP `ok` + body shape, so an error body can never render as
"no alerts") and per-gauge liveness (`gaugeLabel`: a row is LIVE only if
**that gauge's** data came from a fresh fetch; backfilled measurements stay
CACHED). The tests now live in this repository: `node scripts/hw_tests.js`.

Recorded as it happened — the regression suite's first execution was
**45/46**: R2 failed because `validNWS` accepted `{features: [1, 2, 3]}`
(non-object entries), which could have rendered garbage alert rows. The
validator was strengthened to require every entry to be an object or null,
and the second run passed 46/46. No other code changed between the two runs.

The expanded suite was NOT part of the original preregistered run: PREREG.md
and its hash are untouched and refer to the 36-test Run 1 only. `scripts/hw_tests.js`
prints both counts separately ("preregistered suite: 36, regression suite: 10")
so the claim stays honest by construction.

**Run 3 — 2026-11-22 19:21 UTC (v1.2 competitive upgrades): 75 passed, 0 failed.**

A third suite, W1–W29 (29 assertions), was added for the v1.2 competitive
upgrades and executed for the first time with this run: **75/75**
(preregistered 36/36, regression 10/10, competitive upgrades 29/29). It
covers the transparent water planner (`waterTarget`: exact arithmetic,
formula string, zero/invalid/one-person/large households, adjustable days),
exact what-changed math (`whatChanged`: +2.10 over exactly 6 h, −0.84,
flat under the 0.05 ft noise threshold, single-point and invalid-timestamp
refusals, the snapshot's 4.86 → 4.82 comparison), the plain-language
briefing (`briefing`: value + timestamp + change sentences, every line
carrying a source, "could not verify" on a failed alert check — never "no
alerts" — unknowns named as unknowns), geographic coverage
(`gaugeRegion` / `inAlertCoverage`: NJ/NY inside, PA and unknown outside),
the readiness summary (`readySummary`: flags, water target, "not safety"
note), and the plan-text water line (included only when the input is
valid). The app-layer script block was also syntax-checked with Node
(`vm.Script`) and all new element ids verified present. First execution of
the W suite: 29/29, no code changed after the run. The W suite is NOT
claimed as part of Run 1 or Run 2.

**Run 4 — 2026-11-22 19:37 UTC (v1.2.1, plan-restore fix): 77 passed, 0 failed.**

Live browser testing of the deployed site (agent-browser/Playwright,
https://mir-ashiq.github.io/highwater/) then caught a real bug the engine
suite could not see: after an offline reload the plan form came up empty
even though the plan was correctly saved in localStorage — the restore loop
indexed `state.plan` by element id (`pName`) while the saved plan stores
plan keys (`contactName`), and the next keystroke would have overwritten
the saved plan with the empty form. This bug existed since v1.0. Fixed by
routing the restore through a single engine mapping, `PLAN_FIELDS`
(id → plan key), with two new tests: W30 (mapping covers every text input
with a real plan key) and W31 (the shipped file uses the mapping, not the
old id-indexed loop). Re-run: **77/77** (preregistered 36/36, regression
10/10, competitive upgrades 31/31).

Browser verification performed on the deployed v1.2.1, recorded as executed:
1. Fresh load: v1.2.1 shell, live USGS fetch working (VALLEY STREAM
   observation timestamped 19:00 UTC, minutes old), NWS check verified
   ("No active NWS alerts … Checked 2026-11-22 19:24 UTC"), 6 gauges with
   per-gauge "changed X ft / Y h" lines, briefing + water planner rendering.
2. Service-worker update: a browser holding the v1.1.0 install served the
   cached old shell once, background-revalidated, and served v1.2.x on the
   next load — the documented update strategy, observed working.
3. Genuine offline reload (network cut, then reload): page served from the
   service worker, net pill "OFFLINE · CACHED", 6 gauges from cached data
   with ages, and — after the fix — the full typed plan (contact, phone,
   meeting place, needs) restored into the form, rendered in the plan panel
   and the pocket card. Screenshots: `screenshots/05-fieldmode.png`,
   `screenshots/06-offline-reload.png`.


