# HighWater

**Flood readiness that survives the flood.**

Live: https://mir-ashiq.github.io/highwater/ · Demo video: `highwater_demo.mp4`
Built at **EvoHacks 2** (Nov 21–22, 2026) — theme: Projects for Social Good.

Every flood app needs the internet. Floods take away the internet.
HighWater is the one file you keep on your phone **before** the storm, that still
works **after** the network dies: live river gauges and weather alerts when you are
online, a real cached snapshot with its age printed when you are not, and
a 72-hour kit + household plan + printable pocket card that never needed a
server in the first place.

## What it does

| Section | What |
| --- | --- |
| **The brief** | A plain-language briefing: the latest reading and its timestamp, exactly what changed since the previous comparable observation, the verified alert status, and whether your plan is saved — every sentence carrying its source. |
| **01 Watch the water** | 6 real USGS river gauges (Hackensack, Passaic, Pascack Brook, Valley Stream) with 24-hour sparklines, trend arrows and a "changed X ft / Y h" line, plus live NWS alerts for NJ/NY. Watch **any** gauge in the country by its USGS site number; gauges outside NJ/NY are labeled as outside alert coverage. An expandable panel states what the data can and cannot establish. |
| **02 The 72-hour kit** | 27 items — every one following National Weather Service and ready.gov guidance, each cited — plus a drinking-water planner that shows its arithmetic: `people × 1 gallon × days`, with the ready.gov source and its limits. Progress is stored offline on your device. |
| **03 The household plan** | Contact person, meeting place, who needs extra help, neighbors to check on, utility shutoffs — builds itself as you type, with a readiness summary (essentials still missing, water target, last updated) that states plainly that a completed checklist is preparation, not safety. |
| **04 The pocket card** | The plan as a printable card. Print it, fold it, keep it in a wallet. Paper is the ultimate offline technology. |
| **Field mode** | A phone-first view (works at 320 px) with only what matters when the power is out: contact, meeting place, who needs help, water target, missing essentials, saved readings with their ages, cached alert status. Renders entirely from this device — zero network calls. |

Accessibility: keyboard-operable throughout (visible focus, 44px+ targets, Esc
exits Field mode), larger-text, high-contrast and night modes, reduced-motion
support, semantic HTML with labeled inputs and live regions.

## The honesty architecture (the actual product)

Most disaster apps hide their failure modes. HighWater's core engineering is a
state machine that never guesses:

- **LIVE** — *this gauge's* data came out of a verified successful fetch in the
  last 30 minutes (per-gauge, never global: one site updating can never relabel
  another site's backfilled data as live).
- **CACHED / SNAPSHOT** — the last real data, with **its age printed next to it**.
  A gauge's *observation* age ("read 46 min ago") is shown separately from its
  *fetch* state, because gauges only report every 5–60 minutes.
- **A failed check is never "no alerts."** HTTP errors and malformed bodies are
  rejected by shape validation; the app says **"Unable to check current
  alerts"** and keeps the last verified data, with the time it was verified.
- **UNKNOWN is never green** — if a gauge can't be reached, you get the last real
  number and its timestamp, never a spinner, never a silent blank.

Gauge readings are shown raw (feet, trend, observation time) exactly as USGS
reports them. HighWater never converts a river reading into a made-up
"flood percentage" and never invents severity. Official warnings come only from
NWS. Safety guidance is quoted, not paraphrased.

**One honest caveat, disclosed:** in some automated/headless browsers the USGS
API refuses requests (HTTP 403 — it blocks bot-like clients). The app then
falls back to the embedded snapshot and says so. In a normal desktop or mobile
browser the live fetch works (the endpoint is verified open: CORS `*`, HTTP 200,
public domain data).

## Built and tested like it matters

- **One `index.html`.** No server, no build step, no sign-in, no tracking, no LLM
  at runtime. Service-worker PWA (cache versioned `highwater-v3`,
  stale-while-revalidate in the background) so it installs, survives airplane
  mode, and already-installed copies update themselves on the next load.
- **Pure-function engine** (`parseUSGS`, `trend`, `sparkline`, `kitStats`,
  `validatePlan`, `netState`, `validNWS`, `validUSGS`, `gaugeLabel`,
  `waterTarget`, `whatChanged`, `briefing`, `gaugeRegion`, `inAlertCoverage`,
  `readySummary`…) extracted from the shipped file between `/*ENGINE:START*/`
  markers and unit-tested in Node.
- **Pre-registered pass bars** (`PREREG.md`, SHA-256 hashed *before* the first
  run): `results.md` records Run 1 as **36/36, first run, no edits after**. After
  independent inspection, a 10-test regression suite (R1–R10) was added covering
  feed verification and per-gauge liveness: Run 2 is **46/46** (first execution
  45/46 — R2 caught a real gap, the validator was strengthened, re-run passed).
  The v1.2 competitive upgrades added a 29-test suite (W1–W29): Run 3 is
  **75/75**, recorded separately. Neither later suite is claimed as part of the
  preregistered run.
- Real data embedded at build time: snapshot taken 2026-11-22 18:23 UTC.

## Run it

Open `index.html`. That's it. (For the installable/offline service worker,
serve it over HTTP: `python3 -m http.server`.)

Tests: `node scripts/hw_tests.js` — self-contained, reads the shipped
`index.html` and the snapshot embedded in it.

## Competitive position — honestly

What v1.2 added against the strongest EvoHacks 2 entries, with evidence and
remaining gaps. Matching an advantage is not the same as beating a rival;
actual results and judge preferences decide that.

| Rival | Their advantage | HighWater's answer (evidence) | Test result | Remaining gap |
| --- | --- | --- | --- | --- |
| WaterMark | Environmental data provenance | Source-and-timestamp on every line: briefing, per-gauge `read X ago`, LIVE/CACHED per gauge, coverage labels for non-NJ/NY gauges, "can/cannot establish" panel | W14–W23 pass | No multi-feed environmental coverage beyond USGS+NWS |
| Resili-Net | End-to-end humanitarian workflow | Household readiness journey in one page, no registration: contact → meeting place → needs → kit → water target → pocket card → print; persists offline | T4/T6/T7, W24–W29 pass | No multi-agency coordination features (by design) |
| FindThem | Mobile emergency usefulness | Field Mode: 320px, contact/meeting/needs/water/essentials/saved readings with ages, cached alerts, zero network calls | engine tests + syntax/id checks pass | Not yet verified on a physical phone in a real offline reload |
| Shelf Check | Published, reproducible tests | `scripts/hw_tests.js` in-repo, three separately recorded runs, pre-registered bars, honest failure history | 75/75 (36/10/29) | No CI pipeline; browser-level (DOM) tests not automated |
| PlainSpeak | Readable, verified language | Plain-language briefing with source on every sentence; unknowns named; failed checks say "could not verify" | W14–W21 pass | No second UI language; no human comprehension review yet |
| Shortfall | Transparent deterministic arithmetic | Water target shown as a formula with source and limits; exact what-changed math with exact intervals | W1–W13 pass | No additional calculators beyond water |
| Strobeproof | Accessibility engineering | Keyboard flow incl. Esc/field toggle, focus-visible, 44px targets, HC/night/large-text modes, reduced motion, semantic HTML + live regions | manual audit of the shipped markup | No NVDA/VoiceOver walkthrough or axe-core run yet — not claimed |

## Sources & credits

- **U.S. Geological Survey** Instantaneous Values service — gauge data, public
  domain. Credit: U.S. Geological Survey.
- **NOAA / National Weather Service** — active alerts (api.weather.gov) and the
  flood-safety guidance quoted in the kit and plan sections
  (weather.gov/safety/flood-before, /flood-during). Public domain.
- **ready.gov/kit** and **ready.gov/water** — emergency supply and water storage
  guidance (1 gallon per person per day, at least 3 days).
- Archivo Black (OFL, subset embedded). No copied code, images or audio from
  any other project: all code written at this hackathon, with AI-assisted
  development **disclosed** per event rules (no AI decides anything at runtime —
  the engine is pure rules and arithmetic).

## License

MIT — see `LICENSE`.
