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
