#!/usr/bin/env node
/**
 * Market Intelligence terminal (mi) - a menu-driven CLI over the site's read-only MCP endpoint.
 * Zero dependencies. Needs Node 18+ and an API key (MI_API_KEY or ~/.mi/config.json).
 *
 *   node mi.mjs                     interactive menu
 *   node mi.mjs snapshot|stress|rbi|yields|brief|health|betas [sector]
 *   node mi.mjs risk TCS
 *   node mi.mjs scenario brent=10 usdinr=2 us10y_bp=25 spx=-3
 */
import { readFileSync, writeFileSync, mkdirSync, chmodSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import readline from "node:readline";

const VERSION = "1.0.0";
const ENDPOINT = process.env.MI_ENDPOINT || "https://getmarketintelligence.in/api/mcp";
const CONFIG_DIR = join(homedir(), ".mi");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
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

function generic(obj, indent = 2, depth = 0) {
  const sp = " ".repeat(indent);
  if (Array.isArray(obj)) {
    for (const v of obj.slice(0, 40)) {
      if (v && typeof v === "object") {
        console.log(`${sp}${dim("-")}`);
        generic(v, indent + 2, depth + 1);
      } else console.log(`${sp}${dim("-")} ${v}`);
    }
    return;
  }
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (v && typeof v === "object" && depth < 3) {
      console.log(`${sp}${cyan(k)}:`);
      generic(v, indent + 2, depth + 1);
    } else console.log(`${sp}${cyan(k)}: ${typeof v === "number" ? num(v) : v}`);
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

const MENU = [
  ["S", "Market snapshot", () => snapshot()],
  ["X", "Macro Stress Index", () => stress()],
  ["B", "Daily brief", () => brief()],
  ["R", "RBI rates & liquidity", () => rbi()],
  ["Y", "India yield curve", () => yields()],
  ["T", "Transmission betas (sector sensitivities)", (ask) => ask("Sector id (blank = all): ").then((s) => betas(s.trim() || undefined))],
  ["N", "Run a macro scenario", async (ask) => {
    const g = async (l) => {
      const v = (await ask(`${l} (blank = 0): `)).trim();
      return v === "" ? undefined : Number(v);
    };
    const shocks = { brent: await g("Brent % move"), usdinr: await g("USD/INR % move"), us10y_bp: await g("US 10Y bp move"), spx: await g("S&P 500 % move") };
    for (const k of Object.keys(shocks)) if (shocks[k] === undefined || Number.isNaN(shocks[k])) delete shocks[k];
    await scenario(shocks);
  }],
  ["K", "Security risk for a symbol", (ask) => ask("Symbol (e.g. TCS, RELIANCE, AAPL): ").then((s) => risk(s.trim()))],
  ["H", "Data health (feed freshness)", () => health()],
  ["A", "Backtest of the stress index", async () => {
    heading("Stress index backtest");
    generic(await call("get_stress_backtest"));
  }],
  ["E", "Edit / replace API key", async (ask) => {
    const k = (await ask("New API key: ")).trim();
    if (k) {
      API_KEY = k;
      saveKey(k);
      console.log(green("  Saved to ~/.mi/config.json"));
    }
  }],
];

function printMenu() {
  console.log(`\n${boldGreen("[+]")} ${bold("Select a menu option:")}\n`);
  for (const [k, label] of MENU) console.log(`    ${k === "S" ? red(bold(k)) : bold(k)} > ${k === "S" ? red(label) : label}`);
  console.log(`\n    ${bold("Z")} > Exit (Ctrl + C)\n`);
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

  console.clear?.();
  console.log(boldGreen(BANNER));
  console.log(await statusBar());
  for (;;) {
    printMenu();
    const choice = (await ask(`Enter your choice > (default is ${bold("S")} > Market snapshot) `)).trim().toUpperCase() || "S";
    if (choice === "Z" || choice === "Q") break;
    const item = MENU.find(([k]) => k === choice);
    if (!item) {
      console.log(red("  Unknown option."));
      continue;
    }
    try {
      await item[2](ask);
    } catch (e) {
      console.log(red(`\n  Error: ${e.message}`));
    }
    await ask(dim("\n  Press Enter to return to the menu..."));
  }
  rl.close();
}

/* ---------- entry ---------- */

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd) return interactive();
  if (cmd === "-v" || cmd === "--version") return console.log(VERSION);
  if (cmd === "-h" || cmd === "--help" || cmd === "help") {
    return console.log(`mi ${VERSION}: Market Intelligence terminal\n\n  mi                        interactive menu\n  mi snapshot|stress|brief|rbi|yields|health|backtest\n  mi betas [sector]\n  mi risk <SYMBOL>\n  mi scenario brent=10 usdinr=2 us10y_bp=25 spx=-3\n\nKey: MI_API_KEY env var or ~/.mi/config.json. Endpoint override: MI_ENDPOINT.`);
  }
  if (!API_KEY) {
    console.error(red("No API key. Set MI_API_KEY or run `mi` once to save one."));
    process.exit(1);
  }
  try {
    switch (cmd) {
      case "snapshot": return await snapshot();
      case "stress": return await stress();
      case "brief": return await brief();
      case "rbi": return await rbi();
      case "yields": return await yields();
      case "health": return await health();
      case "betas": return await betas(rest[0]);
      case "risk": return await risk(rest[0]);
      case "backtest": return generic(await call("get_stress_backtest"));
      case "scenario": {
        const shocks = {};
        for (const kv of rest) {
          const [k, v] = kv.split("=");
          if (!["brent", "usdinr", "us10y_bp", "spx"].includes(k) || Number.isNaN(Number(v))) throw new Error(`Bad shock "${kv}". Use brent=10 usdinr=2 us10y_bp=25 spx=-3`);
          shocks[k] = Number(v);
        }
        return await scenario(shocks);
      }
      default:
        throw new Error(`Unknown command "${cmd}". Try: mi --help`);
    }
  } catch (e) {
    console.error(red(`Error: ${e.message}`));
    process.exit(1);
  }
}

main();
