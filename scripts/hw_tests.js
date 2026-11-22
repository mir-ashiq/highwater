#!/usr/bin/env node
/* HighWater engine tests. Extracts the engine between the ENGINE markers in
   the shipped index.html (the exact code users get), evals it in a fresh VM
   context, and runs three separately-recorded suites:
   - T1–T8:  the original preregistered suite (36 assertions, PREREG.md)
   - R1–R10: the post-inspection regression suite (feed verification,
     per-gauge liveness) added after the fixes of 2026-11-22
   - W1–W29: the v1.2 competitive-upgrade suite (water planner, what-changed,
     briefing, coverage, readiness summary) added 2026-11-22/23
   None of the later suites are claimed as part of the original preregistered
   run; results.md records every run separately. */
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const a = html.indexOf("/*ENGINE:START*/");
const b = html.indexOf("/*ENGINE:END*/");
if (a < 0 || b < 0) { console.error("ENGINE markers not found"); process.exit(2); }
const engineSrc = html.slice(a, b);

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(engineSrc + "\n;globalThis.HW = HW;", sandbox, { timeout: 5000 });
const HW = sandbox.HW;

/* the snapshot is embedded in the shipped file — tests run against it */
const sm = html.match(/const SNAPSHOT = (\{[^\n]*\});/);
if (!sm) { console.error("SNAPSHOT not found"); process.exit(2); }
const snap = JSON.parse(sm[1]);

let pass = 0, fail = 0;
let GROUP = "pre";
const counts = { pre: 0, reg: 0, comp: 0 };
function t(name, cond, extra) {
  if (cond) { pass++; counts[GROUP]++; console.log("  ok  " + name); }
  else { fail++; console.log("  FAIL " + name + (extra ? "  -> " + extra : "")); }
}

/* ============ T1–T8: original preregistered suite (PREREG.md) ============ */

/* T1 — USGS round-trip (Bar 2) */
const g = HW.parseUSGS({ value: { timeSeries: snap.gauges.map((s) => ({
  sourceInfo: { siteCode: [{ value: s.id }], siteName: s.name,
    geoLocation: { geogLocation: { lat: s.lat, long: s.lon } } },
  variable: { unit: { unitCode: s.unit } },
  values: [{ value: s.series.map((p) => ({ dateTime: p[0], value: String(p[1]) })) }],
})) } });
t("T1a parseUSGS returns 6 gauges", g.length === 6, "got " + g.length);
const mill = g.find((x) => x.id === "01379000");
const vs = g.find((x) => x.id === "01311500");
t("T1b Millington = 4.82 ft", mill && mill.value === 4.82, mill && String(mill.value));
t("T1c Valley Stream = 1.05 ft", vs && vs.value === 1.05, vs && String(vs.value));
t("T1d series lengths preserved", g.every((x) => Array.isArray(x.series) && x.series.length === snap.gauges.find((s) => s.id === x.id).series.length));

/* T2 — malformed input honesty (Bar 7) */
t("T2a parseUSGS(null) = []", Array.isArray(HW.parseUSGS(null)) && HW.parseUSGS(null).length === 0);
t("T2b parseUSGS empty series = []", HW.parseUSGS({ value: { timeSeries: [] } }).length === 0);
t("T2c parseNWS({}) = []", Array.isArray(HW.parseNWS({})) && HW.parseNWS({}).length === 0);
const nws = HW.parseNWS({ features: [{ id: "u1", properties: { event: "Flood Warning", headline: "h", areaDesc: "Essex NJ", severity: "Severe", effective: "e", expires: "x" } }] });
t("T2d parseNWS extracts one alert", nws.length === 1 && nws[0].event === "Flood Warning" && nws[0].areaDesc === "Essex NJ");

/* T3 — trend exactness (Bar 3) */
const tr = HW.trend([["2026-11-22T10:00Z", 1.0], ["2026-11-22T22:00Z", 3.1]]);
t("T3a rising +2.10", tr.d === 2.10 && tr.dir === "rising", JSON.stringify(tr));
const tf = HW.trend([["t", 4.0], ["t", 3.16]]);
t("T3b falling -0.84", tf.d === -0.84 && tf.dir === "falling", JSON.stringify(tf));
const tflat = HW.trend([["t", 2.0], ["t", 2.02]]);
t("T3c flat +0.02", tflat.d === 0.02 && tflat.dir === "flat", JSON.stringify(tflat));
t("T3d single point = flat 0", HW.trend([["t", 5]]).dir === "flat" && HW.trend([["t", 5]]).d === 0);

/* T4 — validation (Bar 4) */
const vEmpty = HW.validatePlan({ contactName: "", contactPhone: "" });
t("T4a empty plan fails both", !vEmpty.ok && !!vEmpty.errors.contactName && !!vEmpty.errors.contactPhone);
t("T4b 201-555-0134 valid", HW.validatePlan({ contactName: "A", contactPhone: "201-555-0134" }).ok);
t("T4c 12345 rejected", !HW.validatePlan({ contactName: "A", contactPhone: "12345" }).ok);
t("T4d neighbor (555) rejected", !HW.validatePlan({ contactName: "A", contactPhone: "201-555-0134", neighbor1Phone: "(555)" }).ok);
t("T4e full valid plan ok", HW.validatePlan({ contactName: "Ana", contactPhone: "201 555 0134", neighbor1Phone: "973-555-0199" }).ok);

/* T5 — sparklines (Bar 5) */
let sparkOK = true, sparkBad = "";
snap.gauges.forEach((s) => {
  const p = HW.sparkline(s.series, 100, 30);
  if (!(typeof p === "string" && p.startsWith("M") && p.includes(" L") && !p.includes("NaN"))) { sparkOK = false; sparkBad = s.id; }
});
t("T5 all 6 snapshot sparklines valid", sparkOK, sparkBad);
t("T5b short series = empty string", HW.sparkline([["t", 1]], 100, 30) === "");

/* T6 — plan text (Bar 6) */
const plan = { contactName: "Ana", contactPhone: "201-555-0134", meetingPlace: "", needsHelp: "", neighbor1Name: "Mr. Ruiz", neighbor1Phone: "973-555-0199", shutoffWater: true, shutoffGas: true, shutoffElec: false };
const txt = HW.planText(plan, { done: 10, total: 27 }, snap.gauges);
t("T6a contact line", txt.includes("CONTACT: Ana · 201-555-0134"));
t("T6b no MEETING PLACE when blank", !txt.includes("MEETING PLACE"));
t("T6c shutoffs listed", txt.includes("SHUTOFFS KNOWN: WATER, GAS"));
t("T6d TADD + 911 present", txt.includes("Turn Around, Don't Drown") && txt.includes("call 911"));
t("T6e kit count + gauges", txt.includes("KIT: 10/27 ready") && txt.includes("USGS 01379000"));

/* T7 — kit stats (fixture items, same shape as KIT) */
const items = [
  { id: "w1", cat: "Water & food", label: "Water", cite: "NWS" },
  { id: "w2", cat: "Water & food", label: "Food", cite: "NWS" },
  { id: "r1", cat: "Radio & light", label: "Radio", cite: "NWS" },
];
const ks = HW.kitStats(items, { w1: true });
t("T7a kitStats 1/3 = 33%", ks.done === 1 && ks.total === 3 && ks.pct === 33);
t("T7b missing list", ks.missing.length === 2 && ks.missing[0].id === "w2");
const kt = HW.kitMissingText(ks);
t("T7c missing text grouped", kt.includes("[Water & food]") && kt.includes("- Food"));
t("T7d complete text", HW.kitMissingText({ missing: [], total: 3 }).includes("complete"));

/* T8 — net + misc */
t("T8a netState offline cached", HW.netState(false, Date.now() - 5e6, Date.now()).label === "CACHED");
t("T8b netState online fresh live", HW.netState(true, Date.now() - 6e5, Date.now()).label === "LIVE");
t("T8c netState online stale", HW.netState(true, Date.now() - 46e6, Date.now()).label === "STALE");
t("T8d netState no data snapshot", HW.netState(true, 0, Date.now()).label === "SNAPSHOT");
t("T8e siteIdOK", HW.siteIdOK("01374500") && !HW.siteIdOK("0137") && !HW.siteIdOK("abc") && !HW.siteIdOK(""));
t("T8f digits strips", HW.digits("(201) 555-0134") === "2015550134");
t("T8g shutoffList", HW.shutoffList({}) === "none marked" && HW.shutoffList({ shutoffWater: true, shutoffGas: true, shutoffElec: true }) === "water, gas, electric");
t("T8h fmtAge", HW.fmtAge(new Date(Date.now() - 30000).toISOString(), Date.now()) === "just now"
  && HW.fmtAge(new Date(Date.now() - 5 * 60000).toISOString(), Date.now()) === "5 min ago"
  && HW.fmtAge(new Date(Date.now() - 185 * 60000).toISOString(), Date.now()) === "3 h 5 min ago");

/* ============ R1–R10: post-inspection regression suite ============
   Added 2026-11-22 after independent inspection. NOT part of the original
   preregistered run. Covers:
   (1) NWS HTTP errors / malformed bodies must never render as "no alerts"
   (2) per-gauge LIVE labels: a fresh fetch of one site must not relabel
       backfilled measurements of other sites.
   ==================================================================== */
GROUP = "reg";

/* R1–R4: feed verification (issue 1) */
t("R1 validNWS accepts a real empty feed", HW.validNWS({ features: [] }) === true);
t("R2 validNWS rejects error-shaped bodies", HW.validNWS({}) === false && HW.validNWS({ error: { message: "upstream" } }) === false && HW.validNWS({ features: [1, 2, 3] }) === false);
t("R3 validNWS rejects null / string features", HW.validNWS(null) === false && HW.validNWS({ features: "oops" }) === false);
t("R4 parseNWS survives non-array features", Array.isArray(HW.parseNWS({ features: "oops" })) && HW.parseNWS({ features: "oops" }).length === 0);

/* R5–R6: USGS verification (same discipline) */
t("R5 validUSGS accepts well-shaped body", HW.validUSGS({ value: { timeSeries: [] } }) === true);
t("R6 validUSGS rejects null/empty/wrong shape", HW.validUSGS(null) === false && HW.validUSGS({}) === false && HW.validUSGS({ value: {} }) === false && HW.validUSGS({ value: { timeSeries: "x" } }) === false);

/* R7–R10: per-gauge liveness (issue 2) */
const NOW = 1800000000000;
t("R7 fresh fetch this gauge -> LIVE", HW.gaugeLabel({ fetchedMs: NOW - 2 * 60000 }, NOW, true) === "LIVE");
t("R8 45-min-old fetch -> CACHED", HW.gaugeLabel({ fetchedMs: NOW - 45 * 60000 }, NOW, true) === "CACHED");
t("R9 never-fetched backfill stays CACHED beside a fresh sibling",
  HW.gaugeLabel({ id: "01379000" }, NOW, true) === "CACHED" && HW.gaugeLabel({ fetchedMs: NOW - 60000 }, NOW, true) === "LIVE");
t("R10 offline -> CACHED even with 1-min-old fetch", HW.gaugeLabel({ fetchedMs: NOW - 60000 }, NOW, false) === "CACHED");

/* ============ W1–W29: v1.2 competitive-upgrade suite ============
   Added 2026-11-22/23 for the competitive upgrades. NOT part of PREREG
   Run 1 or the R regression suite; recorded as its own run in results.md.
   Covers: transparent water arithmetic, exact what-changed math, the
   plain-language briefing (values, timestamps, sources, honest unknowns,
   never "no alerts" on a failed check), geographic coverage labels, the
   readiness summary, and plan-text water lines. */
GROUP = "comp";

/* W1–W7: household water planner (Shortfall-style transparent arithmetic) */
const wOk = HW.waterTarget(3, 3, 1);
t("W1 3 people x 1 gal x 3 days = 9 gallons", wOk.ok && wOk.gallons === 9, JSON.stringify(wOk));
t("W2 formula spells out the arithmetic", wOk.formula === "3 people × 1 gallon per person per day × 3 days = 9 gallons", wOk.formula);
t("W3 zero / non-numeric / negative members rejected", !HW.waterTarget(0, 3, 1).ok && !HW.waterTarget("abc", 3, 1).ok && !HW.waterTarget(-2, 3, 1).ok);
t("W4 one-person household 1x1x3", HW.waterTarget(1, 3, 1).gallons === 3);
t("W5 large household 8x1x7", HW.waterTarget(8, 7, 1).gallons === 56);
t("W6 days adjustable: 3 people x 2 days", HW.waterTarget(3, 2, 1).gallons === 6);
t("W7 invalid days rejected", !HW.waterTarget(3, 0, 1).ok && !HW.waterTarget(3, NaN, 1).ok);

/* W8–W13: what-changed (WaterMark-style exact change, never a probability) */
const ch = HW.whatChanged([["2026-11-22T06:00:00Z", 1.0], ["2026-11-22T12:00:00Z", 3.1]], 6);
t("W8 change is exact: +2.10 over exactly 6 h", ch.ok && ch.d === 2.10 && ch.gapHours === 6 && ch.dir === "rising", JSON.stringify(ch));
t("W9 falling change -0.84 over 6 h", HW.whatChanged([["2026-11-22T06:00:00Z", 4.0], ["2026-11-22T12:00:00Z", 3.16]], 6).d === -0.84);
t("W10 +0.02 below noise threshold -> flat", HW.whatChanged([["2026-11-22T06:00:00Z", 2.0], ["2026-11-22T12:00:00Z", 2.02]], 6).dir === "flat");
t("W11 single observation -> not comparable", !HW.whatChanged([["t", 5]], 6).ok);
t("W12 invalid timestamps -> refused", !HW.whatChanged([["x", 1], ["y", 3]], 6).ok);
const chSnap = HW.whatChanged(snap.gauges[4].series, 24);   // Millington, embedded snapshot
t("W13 snapshot 24-h comparison: 4.86 -> 4.82", chSnap.ok && chSnap.from === 4.86 && chSnap.to === 4.82 && chSnap.d === -0.04, JSON.stringify(chSnap));

/* W14–W21: plain-language briefing (PlainSpeak-style, evidence-linked) */
const bg = { name: "Passaic River near Millington NJ", value: 4.82, unit: "ft", time: "2026-11-22T18:00:00.000Z",
  series: [["2026-11-22T12:00:00Z", 4.86], ["2026-11-22T18:00:00Z", 4.82]] };
const bl = HW.briefing(bg, { state: "ok", alerts: [], region: "New Jersey or New York", checkedISO: "2026-11-22T19:00:00.000Z" },
  { saved: true, kitDone: 10, kitTotal: 27, updatedISO: "2026-11-22T19:10:00.000Z" }, Date.parse("2026-11-22T19:15:00Z"));
t("W14 briefing reports the reading + units + station", bl.some((l) => l.text.includes("4.82 ft") && l.text.includes("Passaic River")));
t("W15 briefing reports the observation timestamp", bl.some((l) => l.text.includes("recorded at") && l.text.includes("18:00")));
t("W16 briefing reports the exact change as not-a-forecast", bl.some((l) => l.text.includes("-0.04 ft") && l.text.includes("not a forecast")));
t("W17 briefing: verified empty feed -> 'no active NWS alerts'", bl.some((l) => l.text.includes("no active NWS alerts")));
t("W18 briefing: plan works offline, kit count shown", bl.some((l) => l.text.includes("remains available offline") && l.text.includes("10/27")));
t("W19 every briefing line carries a source", bl.every((l) => typeof l.source === "string" && l.source.length > 1));
const blFail = HW.briefing(bg, { state: "fail", checkedISO: "2026-11-22T18:41:00.000Z" }, { saved: false }, 0);
t("W20 failed alert check -> 'could not verify', never 'no alerts'", blFail.some((l) => l.text.includes("could not verify")) && !blFail.some((l) => l.text.includes("no active NWS alerts")));
const blBare = HW.briefing({ name: "USGS site 99999999", value: 2.5, unit: "ft", time: "" }, { state: "none-yet" }, { saved: false }, 0);
t("W21 unknown data stays unknown — no invented time or change", blBare.some((l) => l.text.includes("unknown")) && blBare.some((l) => l.text.includes("not enough comparable readings")));

/* W22–W23: geographic coverage honesty */
t("W22 gaugeRegion parses the state code from USGS names",
  HW.gaugeRegion({ name: "Passaic River near Millington NJ" }) === "NJ" &&
  HW.gaugeRegion({ name: "SUSQUEHANNA RIVER AT HARRISBURG PA" }) === "PA" &&
  HW.gaugeRegion({ name: "USGS site 123" }) === "");
t("W23 coverage: NJ/NY inside, PA and unknown outside",
  HW.inAlertCoverage({ name: "X NY" }, ["NJ", "NY"]) === true &&
  HW.inAlertCoverage({ name: "X PA" }, ["NJ", "NY"]) === false &&
  HW.inAlertCoverage({ name: "USGS site 123" }, ["NJ", "NY"]) === false);

/* W24–W27: readiness summary (deterministic, no safety claim) */
const rs = HW.readySummary({ contactName: "Ana", contactPhone: "201-555-0134", meetingPlace: "", needsHelp: "Mom" },
  { done: 10, total: 27, pct: 37 }, ["Water — 1 gallon per person per day, 3 days"], HW.waterTarget(3, 3, 1), "2026-11-22T19:10:00Z");
t("W24 summary counts and flags", rs.kitDone === 10 && rs.contactMissing === false && rs.meetingMissing === true && rs.needsHelp === true);
t("W25 summary carries water target + updated date", rs.water && rs.water.gallons === 9 && rs.updatedISO === "2026-11-22T19:10:00Z");
const rs2 = HW.readySummary({}, { done: 0, total: 27, pct: 0 }, [], HW.waterTarget(0, 3, 1), "");
t("W26 empty plan: contact missing, invalid water dropped", rs2.contactMissing === true && rs2.water === null);
t("W27 summary never claims safety", rs.note.includes("not safety") && rs2.note === rs.note);

/* W28–W29: plan text carries the water line only when valid */
const txtW = HW.planText(plan, { done: 10, total: 27 }, snap.gauges, HW.waterTarget(3, 3, 1));
t("W28 planText includes the transparent water target", txtW.includes("WATER TARGET: 9 gallons"));
const txtW2 = HW.planText(plan, { done: 10, total: 27 }, snap.gauges, HW.waterTarget(0, 3, 1));
t("W29 planText omits the water line when input invalid", !txtW2.includes("WATER TARGET"));

/* W30–W31: plan restore mapping (found broken in real offline testing
   2026-11-22: the form used element ids as plan keys, so a reload emptied
   the form and the next keystroke overwrote the saved plan). */
t("W30 PLAN_FIELDS maps every text input to a real plan key",
  HW.PLAN_FIELDS.length === 6 &&
  HW.PLAN_FIELDS.every((p) => Array.isArray(p) && p.length === 2 && /^[a-z]/.test(p[0]) && /^[a-z]/.test(p[1])) &&
  new Set(HW.PLAN_FIELDS.map((p) => p[1])).size === 6 &&
  HW.PLAN_FIELDS.every((p) => p[1] in plan));
t("W31 app restores the form through the engine mapping (grep of shipped file)",
  html.includes("HW.PLAN_FIELDS.forEach") && !html.includes("if (state.plan[id])"));

console.log("\n" + pass + " passed, " + fail + " failed"
  + "  (preregistered: " + counts.pre + "/36, regression: " + counts.reg + "/10, competitive upgrades: " + counts.comp + "/31)");
process.exit(fail ? 1 : 0);
