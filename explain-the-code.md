# Explain the code in 90 seconds

The event rules say you must be able to explain your code. Here is the whole
app in plain English, in the order data flows. If you can say these eight
things, you can defend every line.

1. **One file.** `index.html` holds the styles, the engine, the embedded
   real-data snapshot and the app logic. `sw.js` is a service worker that
   caches the page so it loads with zero network. No server, no build.

2. **`parseUSGS(json)`** — the USGS sends a deep JSON of every gauge. This
   function walks it and returns a flat, clean list: `{id, name, value, time,
   series}`. Round to 2 decimals, drop anything empty. If the input is broken
   it returns `[]` — never a crash, never invented numbers.

3. **`trend(series)`** — first value vs. last value over 24h. If the change is
   under 0.05 ft it's "flat" — that threshold stops sensor noise from flapping
   the arrow up and down.

4. **`sparkline(series, w, h)`** — pure geometry: min/max of the values,
   map each point into a 100×30 box, emit an SVG path string. That's the
   little chart next to every gauge.

5. **`netState(online, lastLiveMs, now)`** — THE honesty machine. If the last
   real fetch is under 30 minutes old and you're online → **LIVE**. Older →
   **STALE**. Offline → **CACHED**, with the age in minutes. No data ever →
   **SNAPSHOT**. The badge can only ever be one of these four things — it is
   impossible for it to guess.

6. **`kitStats` / `validatePlan` / `planText`** — arithmetic and string
   building for sections 02–04: counts and percentages, phone validation
   (strip non-digits, require 10–15), and the copy/print text. No logic
   beyond that.

7. **The app layer** (the IIFE after the engine) does the only impure work:
   `fetch` with an 8-second timeout, `localStorage` for your kit/plan/custom
   gauges, and DOM rendering. Every fetch failure falls back to the snapshot
   and re-renders with honest labels.

8. **Tests.** `scripts/hw_tests.js` reads the SHIPPED index.html, slices out
   the engine between `/*ENGINE:START*/` and `/*ENGINE:END*/`, runs it in a
   Node VM, and asserts: the 6 snapshot gauges round-trip with exact values,
   trend math is exact, bad input gives empty arrays, the state machine gives
   exactly the four labels. The pass bars were written and hashed first
   (PREREG.md); results.md records 36/36 on the first run.

9. **v1.2 additions, same discipline:** `waterTarget(members, days, per)` is
   one multiplication shown as a formula (ready.gov's 1 gallon per person
   per day); invalid input returns an error, never a number.
   `whatChanged(series, hours)` is subtraction between the newest reading
   and the newest comparable earlier one, with the exact time gap — never a
   probability. `briefing(gauge, alertCheck, planCheck)` turns those into
   plain sentences, each carrying its source; a failed alert check says
   "could not verify", unknowns say unknown. `gaugeRegion`/`inAlertCoverage`
   read the state code off USGS names so a non-NJ/NY gauge is labeled
   outside alert coverage. `readySummary` reports what exists and what is
   missing, and states that completeness is not safety. The Field Mode view
   renders only from localStorage and cached data — it makes zero network
   calls by design.

The single sentence version: *USGS and NWS data flows through pure
functions into honest states, and everything you enter flows into
localStorage and a print stylesheet — nothing else exists.*
