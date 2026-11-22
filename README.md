# HighWater

**Flood readiness that survives the flood.**

Live: https://mir-ashiq.github.io/highwater/ · Demo video: `highwater_demo.mp4`
Built at **EvoHacks 2** (Nov 21–22, 2026) — theme: Projects for Social Good.

Every flood app needs the internet. Floods take away the internet.
HighWater is the one file you keep on your phone **before** the storm, that still
works **after** the network dies: live river gauges and weather alerts when
you're online, a real cached snapshot with its age printed when you're not, and
a 72-hour kit + household plan + printable pocket card that never needed a
server in the first place.

## What it does

| Section | What |
| --- | --- |
| **01 Watch the water** | 6 real USGS river gauges (Hackensack, Passaic, Pascack Brook, Valley Stream) with 24-hour sparklines and trend arrows, plus live NWS alerts for NJ/NY. Watch **any** gauge in the country by its USGS site number. |
| **02 The 72-hour kit** | 27 items — every one following National Weather Service and ready.gov guidance, each cited. Progress is stored offline on your device. |
| **03 The household plan** | Contact person, meeting place, who needs extra help, neighbors to check on, utility shutoffs — builds itself as you type. |
| **04 The pocket card** | The plan as a printable card. Print it, fold it, keep it in a wallet. Paper is the ultimate offline technology. |

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
  at runtime. Service-worker PWA (cache versioned `highwater-v2`,
  stale-while-revalidate in the background) so it installs, survives airplane
  mode, and already-installed copies update themselves on the next load.
- **Pure-function engine** (`parseUSGS`, `trend`, `sparkline`, `kitStats`,
  `validatePlan`, `netState`, `validNWS`, `validUSGS`, `gaugeLabel`…) extracted
  from the shipped file between `/*ENGINE:START*/` markers and unit-tested in
  Node.
- **Pre-registered pass bars** (`PREREG.md`, SHA-256 hashed *before* the first
  run): `results.md` records Run 1 as **36/36, first run, no edits after**. After
  independent inspection, a 10-test regression suite (R1–R10) was added covering
  feed verification and per-gauge liveness: Run 2 is **46/46** (first execution
  45/46 — R2 caught a real gap, the validator was strengthened, re-run passed).
  The regression suite is explicitly **not** claimed as part of the
  preregistered run.
- Real data embedded at build time: snapshot taken 2026-11-22 18:23 UTC.

## Run it

Open `index.html`. That's it. (For the installable/offline service worker,
serve it over HTTP: `python3 -m http.server`.)

Tests: `node scripts/hw_tests.js` — self-contained, reads the shipped
`index.html` and the snapshot embedded in it.

## Sources & credits

- **U.S. Geological Survey** Instantaneous Values service — gauge data, public
  domain. Credit: U.S. Geological Survey.
- **NOAA / National Weather Service** — active alerts (api.weather.gov) and the
  flood-safety guidance quoted in the kit and plan sections
  (weather.gov/safety/flood-before, /flood-during). Public domain.
- **ready.gov/kit** — emergency supply kit guidance.
- Archivo Black (OFL, subset embedded). No copied code, images or audio from
  any other project: all code written at this hackathon, with AI-assisted
  development **disclosed** per event rules (no AI decides anything at runtime —
  the engine is pure rules and arithmetic).

## License

MIT — see `LICENSE`.
