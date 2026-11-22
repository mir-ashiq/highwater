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

