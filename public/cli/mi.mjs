#!/usr/bin/env node
/**
 * Market Intelligence terminal (mi) - a menu-driven CLI over the site's read-only MCP endpoint.
 * Zero dependencies. Needs Node 18+ and an API key (MI_API_KEY or ~/.mi/config.json).
 *
 * The menu is built from the server's tool list at start-up, so every feature added to the site's MCP endpoint
 * shows up here without reinstalling. `mi update` refreshes this script itself.
 *
 *   mi                          interactive menu (favourites + browse everything)
 *   mi tools [text]             list every available tool
 *   mi <tool> [key=value ...]   run any tool, e.g. mi get_option_chain underlying=NIFTY expiry=2026-10-06
 *   mi snapshot|stress|brief|rbi|yields|health|backtest|betas|risk|scenario   shortcuts
 *   flags: --json (raw JSON)  --all (no row limit)
 *   mi update                   download the latest mi
 */
import { readFileSync, writeFileSync, mkdirSync, chmodSync, realpathSync, renameSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import readline from "node:readline";

const VERSION = "2.1.0";
const SCRIPT_URL = process.env.MI_SCRIPT_URL || ENDPOINT_BASE() + "/cli/mi.mjs";
function ENDPOINT_BASE() {
  return (process.env.MI_ENDPOINT || "https://getmarketintelligence.in/api/mcp").replace(/\/api\/mcp$/, "");
}
const ENDPOINT = process.env.MI_ENDPOINT || "https://getmarketintelligence.in/api/mcp";
const CONFIG_DIR = join(homedir(), ".mi");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const STATE_FILE = join(CONFIG_DIR, "state.json");
const FLAGS = new Set(process.argv.filter((a) => a.startsWith("--")));
const RAW_JSON = FLAGS.has("--json");
const NO_LIMIT = FLAGS.has("--all");
const ROW_LIMIT = 30;
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

const c = (code) => (s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const green = c("32"), red = c("31"), yellow = c("33"), cyan = c("36"), dim = c("2"), bold = c("1"), boldGreen = c("1;32");

/* ---------- config + MCP client ---------- */

function loadKey() {
  if (process.env.MI_API_KEY) return process.env.MI_API_KEY.trim();
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf8")).apiKey || "";
  } catch {
    return "";
  }
}

function saveKey(apiKey) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify({ apiKey }, null, 2));
  try {
    chmodSync(CONFIG_FILE, 0o600);
  } catch {
    /* non-posix */
  }
}

let API_KEY = loadKey();
let rpcId = 0;

async function call(name, args = {}) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/json", "x-api-key": API_KEY },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method: "tools/call", params: { name, arguments: args } }),
  });
  if (res.status >= 300 && res.status < 400) throw new Error(`Endpoint redirected to ${res.headers.get("location")}. Set MI_ENDPOINT to that URL.`);
  const body = await res.json().catch(() => null);
  if (!body) throw new Error(`Bad response (HTTP ${res.status})`);
  if (body.error) throw new Error(body.error.message);
  const text = body.result?.content?.[0]?.text ?? "";
  if (body.result?.isError) throw new Error(text || "tool failed");
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function rpc(method, params = {}) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/json", "x-api-key": API_KEY },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method, params }),
    signal: AbortSignal.timeout(20000),
  });
  const body = await res.json().catch(() => null);
  if (!body || body.error) throw new Error(body?.error?.message || `HTTP ${res.status}`);
  return body.result;
}

/** Live tool registry from the server. Cached on disk so the menu still works if the listing call fails. */
let TOOLS = [];
async function loadTools() {
  const cache = join(CONFIG_DIR, "tools.json");
  try {
    TOOLS = (await rpc("tools/list")).tools ?? [];
    mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(cache, JSON.stringify(TOOLS));
  } catch {
    try {
      TOOLS = JSON.parse(readFileSync(cache, "utf8"));
    } catch {
      TOOLS = [];
    }
  }
  return TOOLS;
}
const toolTitle = (t) => t.title || t._meta?.title || t.name.replace(/^get_/, "").replace(/_/g, " ");
const toolCategory = (t) => t._meta?.category || "Other";
const findTool = (q) => {
  const n = String(q).toLowerCase().replace(/-/g, "_");
  return TOOLS.find((t) => t.name === n) || TOOLS.find((t) => t.name === `get_${n}`) || TOOLS.find((t) => t.name.replace(/^(get|run)_/, "") === n);
};

function readState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {};
  }
}
function writeState(patch) {
  try {
    mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify({ ...readState(), ...patch }));
  } catch {
    /* ignore */
  }
}

/* ---------- text size (macOS Terminal.app only) ---------- */

const DEFAULT_FONT = 16;
let fontRestore = null;

/** Run AppleScript against the Terminal tab this process is running in. Returns stdout or null. */
function terminalScript(body) {
  if (process.platform !== "darwin" || process.env.TERM_PROGRAM !== "Apple_Terminal" || !(process.stdout.isTTY || process.stderr.isTTY)) return null;
  try {
    const tty = "/dev/" + execFileSync("ps", ["-o", "tty=", "-p", String(process.pid)], { encoding: "utf8", timeout: 3000 }).trim();
    const script = `tell application "Terminal"\nrepeat with w in windows\nrepeat with t in tabs of w\nif tty of t is "${tty}" then\n${body}\nend if\nend repeat\nend repeat\nend tell`;
    return execFileSync("osascript", ["-e", script], { encoding: "utf8", timeout: 5000, stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}
const getFontSize = () => {
  const n = Number(terminalScript("return font size of t"));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const setFontSize = (n) => terminalScript(`set font size of t to ${n}`) !== null;

/** Make text readable by default: enlarge this tab while mi runs, put it back on exit. Saved size 0 = off. */
function applyFontSize() {
  const want = readState().fontSize ?? DEFAULT_FONT;
  if (!want) return "";
  if (process.platform === "darwin" && process.env.TERM_PROGRAM === "Apple_Terminal") {
    const cur = getFontSize();
    if (cur === null || cur >= want) return "";
    if (setFontSize(want)) {
      fontRestore = cur;
      const restore = () => {
        if (fontRestore !== null) {
          setFontSize(fontRestore);
          fontRestore = null;
        }
      };
      process.on("exit", restore);
      if (!readState().fontNoticeShown) {
        writeState({ fontNoticeShown: true });
        return dim(`  Text size raised to ${want} for this window while mi runs. Change: mi font 14   Turn off: mi font off`);
      }
    }
  } else if (!readState().fontNoticeShown) {
    writeState({ fontNoticeShown: true });
    return dim("  Tip: text too small? Zoom your terminal with Cmd + (macOS) or Ctrl + Shift + + (Linux/Windows Terminal).");
  }
  return "";
}

function fontCommand(arg) {
  if (arg === undefined) {
    const cur = getFontSize();
    return console.log(`  Auto text size: ${readState().fontSize === 0 ? "off" : readState().fontSize ?? DEFAULT_FONT}${cur ? `   (this tab is at ${cur})` : ""}\n  Usage: mi font 18   |   mi font off   |   mi font reset`);
  }
  if (arg === "off" || arg === "0") {
    writeState({ fontSize: 0 });
    return console.log(green("  Auto text size turned off."));
  }
  if (arg === "reset") {
    writeState({ fontSize: DEFAULT_FONT });
    return console.log(green(`  Auto text size reset to ${DEFAULT_FONT}.`));
  }
  const n = Number(arg);
  if (!Number.isFinite(n) || n < 9 || n > 40) throw new Error("Use a size between 9 and 40, e.g. mi font 18");
  writeState({ fontSize: n });
  const ok = process.env.TERM_PROGRAM === "Apple_Terminal" && setFontSize(n);
  console.log(green(`  Saved. mi will use text size ${n}.`) + (ok ? "" : dim(" (Applies in macOS Terminal.app; elsewhere use your terminal's zoom.)")));
}

/* ---------- self-update ---------- */

const selfPath = () => {
  try {
    return realpathSync(process.argv[1]);
  } catch {
    return process.argv[1];
  }
};
const sha = (s) => createHash("sha256").update(s).digest("hex");

async function fetchLatestScript() {
  const res = await fetch(SCRIPT_URL, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (!text.startsWith("#!/usr/bin/env node") || !text.includes("Market Intelligence terminal")) throw new Error("Downloaded file does not look like mi");
  return text;
}

async function updateSelf() {
  const latest = await fetchLatestScript();
  const path = selfPath();
  const current = readFileSync(path, "utf8");
  if (sha(current) === sha(latest)) return console.log(green(`  Already up to date (v${VERSION}).`));
  const tmp = `${path}.new`;
  writeFileSync(tmp, latest);
  try {
    chmodSync(tmp, statSync(path).mode);
  } catch {
    /* ignore */
  }
  renameSync(tmp, path);
  writeState({ lastUpdateCheck: Date.now() });
  console.log(green(`  Updated ${path}. Run mi again to use the new version.`));
}

/** At most once per 12h: tell the user if a newer script is published. Never blocks for long, never throws. */
async function updateNotice() {
  try {
    if (Date.now() - (readState().lastUpdateCheck || 0) < 12 * 3.6e6) return "";
    const latest = await Promise.race([fetchLatestScript(), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 2500))]);
    writeState({ lastUpdateCheck: Date.now() });
    return sha(readFileSync(selfPath(), "utf8")) === sha(latest) ? "" : yellow("  A newer version of mi is available: run `mi update` (menu: U).");
  } catch {
    return "";
  }
}

/* ---------- formatting helpers ---------- */

const num = (v, d = 2) => (typeof v === "number" ? v.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d }) : "n/a");
const pct = (v, d = 2) => (typeof v === "number" ? `${v > 0 ? "+" : ""}${v.toFixed(d)}%` : "n/a");
const tone = (v, s) => (typeof v !== "number" || v === 0 ? s : v > 0 ? green(s) : red(s));
const arrow = (v) => (typeof v !== "number" ? " " : v > 0 ? "▲" : v < 0 ? "▼" : "•");
const stripAnsi = (s) => String(s).replace(/\x1b\[[0-9;]*m/g, "");
const pad = (s, n) => String(s) + " ".repeat(Math.max(0, n - stripAnsi(s).length));
const rpad = (s, n) => " ".repeat(Math.max(0, n - stripAnsi(s).length)) + String(s);
const heading = (t) => console.log(`\n${boldGreen(t)}\n${dim("─".repeat(Math.min(78, Math.max(t.length, 30))))}`);
const bar = (score, width = 20) => {
  const n = Math.max(0, Math.min(width, Math.round((score / 100) * width)));
  const col = score >= 60 ? red : score >= 35 ? yellow : green;
  return col("█".repeat(n)) + dim("░".repeat(width - n));
};
const bandColor = (band) => ({ calm: green, watch: yellow, elevated: yellow, stressed: red, critical: red }[band] || cyan)(String(band).toUpperCase());

function table(rows, headers) {
  const widths = headers.map((h, i) => Math.max(stripAnsi(h).length, ...rows.map((r) => stripAnsi(r[i] ?? "").length)));
  console.log("  " + headers.map((h, i) => bold(i === 0 ? pad(h, widths[i]) : rpad(h, widths[i]))).join("  "));
  for (const r of rows) console.log("  " + r.map((cell, i) => (i === 0 ? pad(cell ?? "", widths[i]) : rpad(cell ?? "", widths[i]))).join("  "));
}

const isScalar = (v) => v === null || ["string", "number", "boolean"].includes(typeof v);
const fmtVal = (v, key = "") => {
  if (v === null || v === undefined || v === "") return dim("-");
  if (typeof v === "number") return /(pct|percent)$/i.test(key) ? tone(v, pct(v)) : num(v, Number.isInteger(v) ? 0 : 2);
  if (typeof v === "boolean") return v ? green("yes") : red("no");
  const str = String(v);
  return /^\d{4}-\d{2}-\d{2}T/.test(str) ? str.slice(0, 16).replace("T", " ") : str;
};
const clip = (s, n) => {
  const p = stripAnsi(s);
  return p.length > n ? s.slice(0, 0) + p.slice(0, n - 1) + "…" : s;
};
const termWidth = () => Math.max(60, Math.min(process.stdout.columns || 110, 160));

function renderArray(arr, indent) {
  const sp = " ".repeat(indent);
  if (!arr.length) return console.log(`${sp}${dim("(none)")}`);
  if (arr.every((r) => r && typeof r === "object" && !Array.isArray(r))) {
    const keys = [];
    for (const r of arr.slice(0, 50)) for (const [k, v] of Object.entries(r)) if (isScalar(v) && !keys.includes(k)) keys.push(k);
    const noisy = /^(id|uuid|slug|url|link|href|decimals|focus|copyKey)$|(Key|Id|Uuid|Url|Href)$/;
    const useful = keys.filter((k) => !noisy.test(k));
    const cols = (useful.length >= 2 ? useful : keys).slice(0, 8);
    if (cols.length) {
      const shown = NO_LIMIT ? arr : arr.slice(0, ROW_LIMIT);
      const rows = shown.map((r) => cols.map((k) => String(fmtVal(r[k], k))));
      // fit to the terminal: repeatedly shrink the widest column (min 8) until the table fits
      const widths = cols.map((k, i) => Math.max(k.length, ...rows.map((r) => stripAnsi(r[i]).length)));
      const avail = termWidth() - indent - cols.length * 2;
      while (widths.reduce((a, b) => a + b, 0) > avail) {
        const m = widths.indexOf(Math.max(...widths));
        if (widths[m] <= 8) break;
        widths[m]--;
      }
      table(rows.map((r) => r.map((cell, i) => clip(cell, widths[i]))), cols.map((k, i) => clip(k, widths[i])));
      if (shown.length < arr.length) console.log(dim(`${sp}… ${arr.length - shown.length} more (use --all to show every row, --json for raw data)`));
      return;
    }
  }
  for (const v of (NO_LIMIT ? arr : arr.slice(0, ROW_LIMIT))) {
    if (isScalar(v)) console.log(`${sp}${dim("-")} ${fmtVal(v)}`);
    else {
      console.log(`${sp}${dim("-")}`);
      generic(v, indent + 2);
    }
  }
  if (!NO_LIMIT && arr.length > ROW_LIMIT) console.log(dim(`${sp}… ${arr.length - ROW_LIMIT} more (use --all)`));
}

/** Renders any JSON: scalar fields as key/value, arrays of records as tables, nested objects as indented sections. */
function generic(obj, indent = 2, depth = 0) {
  const sp = " ".repeat(indent);
  if (Array.isArray(obj)) return renderArray(obj, indent);
  if (isScalar(obj)) return console.log(`${sp}${fmtVal(obj)}`);
  const entries = Object.entries(obj ?? {});
  const scalars = entries.filter(([, v]) => isScalar(v));
  const w = Math.min(28, Math.max(0, ...scalars.map(([k]) => k.length)));
  for (const [k, v] of scalars) console.log(`${sp}${cyan(pad(k, w))}  ${fmtVal(v, k)}`);
  for (const [k, v] of entries) {
    if (isScalar(v)) continue;
    console.log(`\n${sp}${boldGreen(k)}`);
    if (depth >= 4) console.log(`${sp}  ${dim("(nested, use --json)")}`);
    else generic(v, indent + 2, depth + 1);
  }
}

/* ---------- screens ---------- */

async function snapshot() {
  const d = await call("get_market_snapshot");
  const m = d.metrics ?? {};
  heading(`Market snapshot  ${dim(d.asOf ?? "")}`);
  const row = (label, val, chg, unit = "") => [label, `${unit}${num(val)}`, chg === undefined ? "" : tone(chg, `${arrow(chg)} ${pct(chg)}`)];
  table(
    [
      row("NIFTY 50", m.nifty, m.nifty_1d_pct),
      row("India VIX", m.india_vix),
      row("US VIX", m.us_vix),
      row("USD/INR", m.usdinr, m.usdinr_1d_pct, "₹"),
      row("Brent crude", m.brent, m.brent_1d_pct, "$"),
      row("US 10Y yield", m.us10y, undefined).map((x, i) => (i === 1 ? `${num(m.us10y, 3)}%` : x)),
      ["India 10Y G-Sec", `${num(m.gsec10y, 3)}%`, ""],
      ["FII net (cash)", tone(m.fii_net, `₹${num(m.fii_net, 0)} cr`), ""],
      ["DII net (cash)", tone(m.dii_net, `₹${num(m.dii_net, 0)} cr`), ""],
      ["RBI net liquidity", `₹${num(m.rbi_net_liquidity, 0)} cr`, ""],
      ["Stress score", `${num(m.stress_score, 1)}`, `${m.families_firing ?? 0} famil${m.families_firing === 1 ? "y" : "ies"} firing`],
    ],
    ["Metric", "Value", "1-day"],
  );
}

async function stress() {
  const d = await call("get_stress_index");
  heading(`India Macro Stress Index  ${dim(d.asOf ?? "")}`);
  console.log(`  Score ${bold(num(d.score, 1))}/100  ${bar(d.score, 30)}  ${bandColor(d.band)}`);
  console.log(`  Convergence: ${bold(d.convergence?.score ?? "n/a")}  firing: ${(d.convergence?.firing ?? []).join(", ") || "none"}`);
  heading("Signal families");
  table(
    (d.families ?? []).map((f) => [f.label, `${bar(f.score, 16)} ${rpad(num(f.score, 0), 3)}`, f.firing ? red("FIRING") : dim("quiet")]),
    ["Family", "Score", "State"],
  );
  heading("Top components");
  const top = [...(d.components ?? [])].sort((a, b) => b.score * b.weight - a.score * a.weight).slice(0, 8);
  table(top.map((x) => [x.label, x.display, num(x.score, 0), `${(x.weight * 100).toFixed(1)}%`]), ["Component", "Reading", "Score", "Weight"]);
  console.log(dim("\n  Heuristic, descriptive - not investment advice."));
}

async function rbi() {
  const d = await call("get_rbi_rates");
  heading("RBI policy corridor");
  const co = d.corridor ?? {};
  table(Object.entries(co).map(([k, v]) => [k, String(v)]), ["Rate", "Value"]);
  heading("System liquidity");
  console.log(`  ${d.systemLiquidity?.value ?? "n/a"}   7d change: ${d.systemLiquidity?.change7d ?? "n/a"}`);
  console.log(dim(`  Source: ${d.systemLiquidity?.source?.provider ?? ""} (${d.systemLiquidity?.source?.asOf ?? ""})`));
  heading("FX reserves");
  console.log(`  ${d.fxReserves?.value ?? "n/a"}  ${dim(`as of ${d.fxReserves?.asOf ?? ""}`)}`);
}

async function yields() {
  const d = await call("get_india_yield_curve");
  heading(`India yield curve  ${dim(d.asOf ?? "")}`);
  table([...(d.tbills ?? []), ...(d.gsecs ?? [])].map((x) => [x.label, `${num(x.yield, 3)}%`]), ["Instrument", "Yield"]);
  if (d.call) console.log(`\n  Call money: ${num(d.call.low)}% - ${num(d.call.high)}%`);
}

async function brief() {
  const d = await call("get_daily_brief");
  heading(`Daily brief (${d.kind ?? ""})  ${dim(d.generatedAt ?? "")}`);
  console.log(`  ${bold(d.headline ?? "")}\n`);
  for (const it of d.items ?? []) console.log(`  ${cyan("•")} ${it.text} ${dim(`[${it.theme}, ${it.stance}]`)}`);
  if (d.watch?.length) {
    heading("Watch next");
    for (const w of d.watch) console.log(`  ${yellow("›")} ${w}`);
  }
  if (d.headlines?.length) {
    heading("Headlines");
    for (const h of d.headlines.slice(0, 6)) console.log(`  ${dim(h.source + ":")} ${h.title}`);
  }
  console.log(dim("\n  Descriptive summary - not investment advice."));
}

async function betas(sector) {
  const d = await call("get_transmission_betas", sector ? { sector } : {});
  heading(`Transmission betas  ${dim(`${d.windowStart} → ${d.windowEnd}`)}`);
  const f = d.factors ?? [];
  table(
    (d.sectors ?? []).map((s) => [s.label, ...f.map((x) => tone(s.betas?.[x.id]?.beta, num(s.betas?.[x.id]?.beta, 2))), num(s.r2, 2)]),
    ["Sector", ...f.map((x) => x.label), "R²"],
  );
  console.log(dim(`\n  ${f.map((x) => `${x.label}: ${x.unit}`).join("  |  ")}\n  Historical partial effects, not forecasts.`));
}

async function scenario(shocks) {
  const d = await call("run_scenario", shocks);
  heading(`Scenario  ${dim(JSON.stringify(d.shocks ?? shocks))}`);
  const rows = [...(d.impacts ?? [])].sort((a, b) => a.impactPct - b.impactPct);
  table(rows.map((r) => [r.label, tone(r.impactPct, pct(r.impactPct)), dim(`±${num(r.seApproxPct)}`), num(r.r2, 2)]), ["Sector", "Impact", "Std err", "R²"]);
  console.log(dim("\n  Model-implied same-day impact from historical betas. Not a forecast."));
}

async function risk(symbol) {
  if (!symbol) throw new Error("Symbol required, e.g. TCS");
  const d = await call("get_security_risk", { symbol: symbol.toUpperCase() });
  heading(`Security risk: ${d.symbol}  ${dim(`${d.market ?? ""} · as of ${d.asOf ?? ""}`)}`);
  table(
    [
      ["Realized volatility (ann.)", `${num(d.realizedVolPct)}%`],
      ["ATR(14)", `${num(d.atr14)}  (${num(d.atrPctOfPrice)}% of price)`],
      ["Max drawdown (1y)", red(`${num(d.maxDrawdownPct)}%`)],
      ["Beta vs " + (d.beta?.benchmark ?? "benchmark"), `${num(d.beta?.value)}  (R² ${num(d.beta?.r2)})`],
      ["52w range", `${num(d.range52w?.low)} - ${num(d.range52w?.high)}  (${num(d.range52w?.positionPct, 0)}% of range)`],
      ["Next earnings", d.nextEarnings ? `${d.nextEarnings.date}${d.nextEarnings.isEstimate ? " (est.)" : ""}` : "n/a"],
    ],
    ["Measure", "Value"],
  );
  if (d.insiderNote) console.log(dim(`\n  ${d.insiderNote}`));
  console.log(dim("  Descriptive statistics of the past, not forecasts."));
}

async function health() {
  const d = await call("get_data_health");
  const list = Array.isArray(d) ? d : d.series ?? [];
  heading(`Data health  ${dim(`${list.length} series`)}`);
  const ageH = (iso) => (iso ? (Date.now() - new Date(iso).getTime()) / 3.6e6 : Infinity);
  const rows = list
    .map((s) => ({ s, age: ageH(s.last_ok) }))
    .sort((a, b) => b.age - a.age)
    .slice(0, 25)
    .map(({ s, age }) => [String(s.label ?? s.id).slice(0, 52), s.provider ?? "", Number.isFinite(age) ? (age > 24 ? red : age > 6 ? yellow : green)(`${age.toFixed(1)}h`) : red("never")]);
  table(rows, ["Series (stalest first)", "Provider", "Age"]);
  const stale = list.filter((s) => ageH(s.last_ok) > 24).length;
  console.log(`\n  ${stale ? yellow(`${stale} series older than 24h`) : green("All series fresh (<24h)")}`);
}

/* ---------- banner, status bar, menu ---------- */

const BANNER = String.raw`
  __  __    _    ____  _  _______ _____
 |  \/  |  / \  |  _ \| |/ / ____|_   _|
 | |\/| | / _ \ | |_) | ' /|  _|   | |
 | |  | |/ ___ \|  _ <| . \| |___  | |
 |_|  |_/_/   \_\_| \_\_|\_\_____| |_|
  ___ _   _ _____ _____ _     _     ___ ____ _____ _   _  ____ _____
 |_ _| \ | |_   _| ____| |   | |   |_ _/ ___| ____| \ | |/ ___| ____|
  | ||  \| | | | |  _| | |   | |    | | |  _|  _| |  \| | |   |  _|
  | || |\  | | | | |___| |___| |___ | | |_| | |___| |\  | |___| |___
 |___|_| \_| |_| |_____|_____|_____|___\____|_____|_| \_|\____|_____|
`;

async function statusBar() {
  try {
    const m = (await call("get_market_snapshot")).metrics ?? {};
    const parts = [
      `NIFTY 50 | ${num(m.nifty)} | ${tone(m.nifty_1d_pct, `${arrow(m.nifty_1d_pct)}${pct(m.nifty_1d_pct)}`)}`,
      `India VIX | ${num(m.india_vix)}`,
      `USD/INR | ${num(m.usdinr)} | ${tone(m.usdinr_1d_pct, pct(m.usdinr_1d_pct))}`,
      `Brent | $${num(m.brent)} | ${tone(m.brent_1d_pct, pct(m.brent_1d_pct))}`,
      `Stress | ${num(m.stress_score, 1)}`,
    ];
    return `v${VERSION} | ${parts.join(" | ")}`;
  } catch (e) {
    return `v${VERSION} | ${red(e.message)}`;
  }
}

/* ---------- generic tool runner (any tool the server exposes) ---------- */

const coerce = (schema, raw) => {
  if (schema?.type === "number" || schema?.type === "integer") {
    const n = Number(raw);
    if (Number.isNaN(n)) throw new Error(`"${raw}" is not a number`);
    return n;
  }
  if (schema?.type === "boolean") return /^(1|true|yes|y)$/i.test(raw);
  return raw;
};

async function promptArgs(tool, ask) {
  const props = tool.inputSchema?.properties ?? {};
  const required = new Set(tool.inputSchema?.required ?? []);
  const args = {};
  for (const [k, sch] of Object.entries(props)) {
    const hint = [sch.description, sch.enum ? `one of: ${sch.enum.join(", ")}` : ""].filter(Boolean).join(" - ");
    for (;;) {
      const v = (await ask(`  ${cyan(k)}${required.has(k) ? red("*") : ""}${hint ? dim(` (${hint})`) : ""}: `)).trim();
      if (v === "") {
        if (required.has(k)) {
          console.log(red("    required"));
          continue;
        }
        break;
      }
      try {
        args[k] = coerce(sch, v);
        break;
      } catch (e) {
        console.log(red(`    ${e.message}`));
      }
    }
  }
  return args;
}

function parseKv(tool, pairs) {
  const props = tool.inputSchema?.properties ?? {};
  const args = {};
  const positional = pairs.filter((p) => !p.includes("="));
  const firstRequired = (tool.inputSchema?.required ?? [])[0] ?? Object.keys(props)[0];
  for (const p of pairs) {
    if (p.includes("=")) {
      const i = p.indexOf("=");
      const k = p.slice(0, i);
      if (!(k in props)) throw new Error(`Unknown argument "${k}". Accepted: ${Object.keys(props).join(", ") || "none"}`);
      args[k] = coerce(props[k], p.slice(i + 1));
    }
  }
  if (positional.length && firstRequired && !(firstRequired in args)) args[firstRequired] = coerce(props[firstRequired], positional.join(" "));
  const missing = (tool.inputSchema?.required ?? []).filter((k) => args[k] === undefined);
  if (missing.length) throw new Error(`Missing: ${missing.join(", ")}. Usage: mi ${tool.name} ${Object.keys(props).map((k) => `${k}=…`).join(" ")}`);
  return args;
}

const SPECIAL = { get_market_snapshot: () => snapshot(), get_stress_index: () => stress(), get_rbi_rates: () => rbi(), get_india_yield_curve: () => yields(), get_daily_brief: () => brief(), get_data_health: () => health() };

async function runTool(tool, args) {
  if (RAW_JSON) return console.log(JSON.stringify(await call(tool.name, args), null, 2));
  if (tool.name === "get_transmission_betas") return betas(args.sector);
  if (tool.name === "run_scenario") return scenario(args);
  if (tool.name === "get_security_risk") return risk(args.symbol);
  if (SPECIAL[tool.name]) return SPECIAL[tool.name]();
  heading(`${toolTitle(tool)}  ${dim(tool.name)}`);
  generic(await call(tool.name, args));
  console.log(dim("\n  Read-only data from Market Intelligence. Descriptive, not investment advice."));
}

/* ---------- interactive menu ---------- */

const FAVOURITES = [
  ["S", "Market snapshot", "get_market_snapshot"],
  ["X", "Macro Stress Index", "get_stress_index"],
  ["B", "Daily brief", "get_daily_brief"],
  ["R", "RBI rates & liquidity", "get_rbi_rates"],
  ["Y", "India yield curve", "get_india_yield_curve"],
  ["T", "Transmission betas (sector sensitivities)", "get_transmission_betas"],
  ["N", "Run a macro scenario", "run_scenario"],
  ["K", "Security risk for a symbol", "get_security_risk"],
  ["H", "Data health (feed freshness)", "get_data_health"],
];

function printMenu() {
  console.log(`\n${boldGreen("[+]")} ${bold("Select a menu option:")}\n`);
  for (const [k, label] of FAVOURITES) console.log(`    ${k === "S" ? red(bold(k)) : bold(k)} > ${k === "S" ? red(label) : label}`);
  console.log(`\n    ${bold("M")} > More: browse all ${TOOLS.length} features by category`);
  console.log(`    ${bold("F")} > Find a feature (search)`);
  console.log(`    ${bold("A")} > Text size (make the text bigger or smaller)`);
  console.log(`    ${bold("E")} > Edit / replace API key`);
  console.log(`    ${bold("U")} > Check for software update`);
  console.log(`\n    ${bold("Z")} > Exit (Ctrl + C)\n`);
}

async function pick(list, ask, label) {
  list.forEach((t, i) => console.log(`    ${bold(pad(String(i + 1), 3))} ${label(t)}`));
  const v = (await ask(`\n  Number (blank to go back): `)).trim();
  const n = Number(v);
  return v && n >= 1 && n <= list.length ? list[n - 1] : null;
}

async function browse(ask, filter) {
  let list = TOOLS;
  if (filter) {
    const f = filter.toLowerCase();
    list = TOOLS.filter((t) => `${t.name} ${toolTitle(t)} ${t.description} ${toolCategory(t)}`.toLowerCase().includes(f));
    if (!list.length) return console.log(red("  No matching feature."));
  } else {
    const cats = [...new Set(TOOLS.map(toolCategory))].sort();
    console.log("");
    const cat = await pick(cats, ask, (c) => `${c} ${dim(`(${TOOLS.filter((t) => toolCategory(t) === c).length})`)}`);
    if (!cat) return;
    list = TOOLS.filter((t) => toolCategory(t) === cat);
  }
  console.log("");
  const tool = await pick(list, ask, (t) => `${pad(toolTitle(t), 32)} ${dim(t.name)}`);
  if (!tool) return;
  console.log(dim(`\n  ${tool.description}\n`));
  await runTool(tool, await promptArgs(tool, ask));
}

async function interactive() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((r) => rl.question(q, r));
  rl.on("close", () => process.exit(0));
  rl.on("SIGINT", () => {
    rl.close();
    process.exit(0);
  });

  if (!API_KEY) {
    console.log(yellow("No API key found. Get one from Deb@getmarketintelligence.in (see /help on the site)."));
    API_KEY = (await ask("Paste your API key: ")).trim();
    if (!API_KEY) process.exit(1);
    saveKey(API_KEY);
  }

  const [, notice] = await Promise.all([loadTools(), updateNotice()]);
  const fontNote = applyFontSize();
  console.clear?.();
  console.log(boldGreen(BANNER));
  console.log(await statusBar());
  if (notice) console.log(notice);
  if (fontNote) console.log(fontNote);
  for (;;) {
    printMenu();
    const choice = (await ask(`Enter your choice > (default is ${bold("S")} > Market snapshot) `)).trim().toUpperCase() || "S";
    if (choice === "Z" || choice === "Q") break;
    try {
      const fav = FAVOURITES.find(([k]) => k === choice);
      if (fav) {
        const tool = findTool(fav[2]);
        const args = fav[2] === "get_transmission_betas" ? await ask("Sector id (blank = all): ").then((s) => (s.trim() ? { sector: s.trim() } : {})) : tool ? await promptArgs(tool, ask) : {};
        await runTool(tool ?? { name: fav[2], title: fav[1] }, args);
      } else if (choice === "M") await browse(ask);
      else if (choice === "F") await browse(ask, (await ask("  Search text: ")).trim());
      else if (choice === "A") {
        const v = (await ask(`  Text size (9-40, current auto: ${readState().fontSize ?? DEFAULT_FONT}, "off" to disable): `)).trim();
        if (v) fontCommand(v);
      } else if (choice === "E") {
        const k = (await ask("New API key: ")).trim();
        if (k) {
          API_KEY = k;
          saveKey(k);
          console.log(green("  Saved to ~/.mi/config.json"));
        }
      } else if (choice === "U") await updateSelf();
      else {
        console.log(red("  Unknown option."));
        continue;
      }
    } catch (e) {
      console.log(red(`\n  Error: ${e.message}`));
    }
    await ask(dim("\n  Press Enter to return to the menu..."));
  }
  rl.close();
}

/* ---------- entry ---------- */

const HELP = `mi ${VERSION}: Market Intelligence terminal

  mi                          interactive menu (favourites, browse all, search)
  mi tools [text]             list every available feature
  mi <tool> [key=value ...]   run any feature, e.g.
      mi get_option_chain underlying=NIFTY expiry=2026-10-06
      mi risk TCS        mi scenario brent=10 usdinr=2        mi ipos status=open
  shortcuts: snapshot stress brief rbi yields health backtest betas risk scenario
  flags: --json raw JSON   --all show every row
  mi update                   download the latest mi
  mi font [N|off|reset]       text size while mi runs (macOS Terminal.app), default 16
  mi --version

Key: MI_API_KEY env var or ~/.mi/config.json. Endpoint override: MI_ENDPOINT.`;

const ALIASES = { snapshot: "get_market_snapshot", stress: "get_stress_index", brief: "get_daily_brief", rbi: "get_rbi_rates", yields: "get_india_yield_curve", health: "get_data_health", backtest: "get_stress_backtest", betas: "get_transmission_betas", risk: "get_security_risk", scenario: "run_scenario" };

async function main() {
  const argv = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const [cmd, ...rest] = argv;
  if (FLAGS.has("--version") || FLAGS.has("-v")) return console.log(VERSION);
  if (FLAGS.has("--help") || cmd === "help") return console.log(HELP);
  if (!cmd) return interactive();
  if (cmd === "font") {
    try {
      return fontCommand(rest[0]);
    } catch (e) {
      console.error(red(`Error: ${e.message}`));
      process.exit(1);
    }
  }
  if (cmd === "update") {
    try {
      return await updateSelf();
    } catch (e) {
      console.error(red(`Update failed: ${e.message}`));
      process.exit(1);
    }
  }
  if (!API_KEY) {
    console.error(red("No API key. Set MI_API_KEY or run `mi` once to save one."));
    process.exit(1);
  }
  try {
    await loadTools();
    if (cmd === "tools") {
      const f = (rest.join(" ") || "").toLowerCase();
      const list = TOOLS.filter((t) => !f || `${t.name} ${toolTitle(t)} ${t.description} ${toolCategory(t)}`.toLowerCase().includes(f));
      for (const cat of [...new Set(list.map(toolCategory))].sort()) {
        heading(cat);
        for (const t of list.filter((x) => toolCategory(x) === cat)) {
          const args = Object.keys(t.inputSchema?.properties ?? {});
          console.log(`  ${pad(t.name, 26)} ${pad(toolTitle(t), 30)} ${dim(args.length ? args.map((a) => `${a}=`).join(" ") : "")}`);
        }
      }
      return console.log(dim(`\n  ${list.length} feature(s). Run one with: mi <name> [key=value ...]`));
    }
    const tool = findTool(ALIASES[cmd] ?? cmd);
    if (!tool) throw new Error(`Unknown command "${cmd}". Try: mi tools`);
    if (tool.name === "run_scenario" || tool.name === "get_transmission_betas" || tool.name === "get_security_risk") {
      // keep the friendly shortcut forms: `mi risk TCS`, `mi betas bank`, `mi scenario brent=10`
      const args = {};
      if (tool.name === "get_security_risk") args.symbol = rest[0];
      else if (tool.name === "get_transmission_betas") { if (rest[0]) args.sector = rest[0]; }
      else Object.assign(args, parseKv(tool, rest));
      if (tool.name === "get_security_risk" && !args.symbol) throw new Error("Symbol required, e.g. mi risk TCS");
      return await runTool(tool, args);
    }
    return await runTool(tool, parseKv(tool, rest));
  } catch (e) {
    console.error(red(`Error: ${e.message}`));
    process.exit(1);
  }
}

main();
