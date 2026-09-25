"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import { Download, FileSpreadsheet, Loader2, ShieldAlert } from "lucide-react";
import { useState } from "react";

const EMAIL = "Deb@getmarketintelligence.in";

/** Keep in step with the sheets produced by src/lib/export/build.ts. */
const GROUPS: { title: string; blurb: string; sheets: [string, string][] }[] = [
  {
    title: "Market snapshot",
    blurb: "Where markets stand right now",
    sheets: [
      ["Market Pulse", "NIFTY, SENSEX, BANK NIFTY, VIX, USD/INR, 10Y yield, Brent, Gold"],
      ["Indices · Index History", "Index levels with 1D/1W/1M/YTD change and daily history"],
      ["Breadth & F&O", "Advances/declines, 52-week highs/lows, PCR, OI, max pain, top strikes"],
      ["Global Radar · Live Quotes · Live Ticker", "Global indices, VIX, dollar, yields and every live quote"],
      ["Money Flow", "FII/DII flows for today, 5 days, 1 month and YTD"],
      ["Commodities & FX · Yield Curves", "Commodity and currency tape; India and US yield curves"],
    ],
  },
  {
    title: "Macro & RBI",
    blurb: "The economy behind the market",
    sheets: [
      ["RBI & Liquidity", "Policy corridor, system liquidity, forex reserves, 30-day trend"],
      ["India Macro · India Macro History · India Impact", "Headline macro indicators, 12-month history, India impact score"],
      ["Macro Hub · Macro Hub History · Macro Highlights", "Every Macro-page metric across 10 sections, with full history"],
      ["Macro Regime · Feed Macro Series", "Regime signals and history; global macro series"],
      ["Transmission Map · Sector Betas · Scenario Presets", "How Brent, rupee, yields and the S&P move sectors"],
    ],
  },
  {
    title: "Risk",
    blurb: "When stress builds",
    sheets: [["Stress Index · Stress History · Stress Alerts · Stress Backtest", "The 0–100 stress index, its families and components, history, alerts and backtest"]],
  },
  {
    title: "Scanners & AI",
    blurb: "Every signal, with the receipts",
    sheets: [
      ["Nifty 500 Universe · Scanner Catalogue", "The 500 stocks and all 27 scanner definitions"],
      ["Scanner Results", "Every stock flagged by every scanner in the latest session"],
      ["Scanner Backtests · Backtest Equity Curves", "Win rate, returns and edge by scanner and hold period; ₹10K growth curves"],
      ["AI Signals (Nifty · BTST-STBT)", "Model lean, its walk-forward track record, and stock candidates"],
    ],
  },
  {
    title: "Events & derivatives",
    blurb: "What's coming and where the options money is",
    sheets: [
      ["Earnings Dates · IPOs", "Next results dates; open, upcoming, closed and listed IPOs"],
      ["Options Flow Flags · Options Flow Snapshots · F&O Universe", "Flag log, dated options-volume snapshots and the optionable universe"],
    ],
  },
  {
    title: "Research & news",
    blurb: "Read it, then verify it",
    sheets: [
      ["News Headlines · Research Reports", "Headlines and broker recommendations, each linked to the original"],
      ["Daily Briefs · Brief Facts & Headlines", "Pre-market and post-close briefs with the facts they cite"],
      ["Change Log", "Every change the notification bell has announced"],
    ],
  },
  {
    title: "Open data & collectors",
    blurb: "The plumbing, exposed",
    sheets: [
      ["Collected Series · Collected Series Data", "RBI, Cboe VIX, CFTC, BLS, ECB, AMFI, Damodaran series with full observations"],
      ["Open Data Datasets · Open Data Records", "data.gov.in datasets mirrored by the platform"],
      ["Feed Health", "Status of every upstream data feed at the time of export"],
    ],
  },
  {
    title: "Reference",
    blurb: "Definitions, sources and honesty",
    sheets: [
      ["Metric Definitions", "What every metric means, how it's calculated and where it comes from"],
      ["Sources & Licences · Export Log", "Every provider with links, and exactly what was and wasn't included"],
    ],
  },
];

const NOT_INCLUDED = [
  ["Sectors and Economic Calendar pages", "They currently show illustrative sample values, not live data, so they are not exported as market data."],
  ["Portfolio pages", "They show each person's private holdings and are never exported."],
  ["CMIE Prowess company reports", "Licensed third-party financials stay out until redistribution rights are confirmed."],
];

type Phase = "idle" | "working" | "done" | "error";

export default function DataExportPage() {
  const [agree, setAgree] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function download() {
    setPhase("working");
    setMessage(null);
    try {
      const res = await fetch("/api/export/xlsx?agree=1", { cache: "no-store" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Download failed (HTTP ${res.status})`);
      }
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "MarketIntelligence_Data.xlsx";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setPhase("done");
      setMessage(`${name} · ${(blob.size / 1024 / 1024).toFixed(1)} MB`);
    } catch (e) {
      setPhase("error");
      setMessage(e instanceof Error ? e.message : "Download failed");
    }
  }

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto pb-16">
      <PageHeader
        kicker="Data Export"
        title="Download all market data"
        subtitle="One structured Excel workbook with every dataset behind the platform, one tab per topic, sources linked on every sheet. Generated live, so it reflects the data as of this moment."
      />

      <Panel title="Get the workbook" subtitle="Takes up to a minute: it collects live data from dozens of sources and builds the file for you.">
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-rose-500/30 bg-rose-500/5 p-4 text-sm">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-rose-600" />
            <div className="space-y-1.5">
              <p className="font-semibold text-rose-700">Strictly for personal use. No commercial use.</p>
              <p className="text-muted-foreground">
                For commercial use, contact <a className="font-semibold text-primary hover:underline" href={`mailto:${EMAIL}`}>{EMAIL}</a>. Licensed data and assets: not for reproduction, redistribution or resale unless authorised in writing. Third-party data belongs to its providers. For any issue or clarification, email us at <a className="font-semibold text-primary hover:underline" href={`mailto:${EMAIL}`}>{EMAIL}</a>.
              </p>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 text-sm">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 size-4" />
            <span>I understand and agree: this download is for my personal use only, and I will not reproduce, share or use it commercially without written authorisation.</span>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!agree || phase === "working"}
              onClick={download}
              className={cn("inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors", agree && phase !== "working" ? "bg-blue-600 hover:bg-blue-700" : "cursor-not-allowed bg-blue-600/40")}
            >
              {phase === "working" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {phase === "working" ? "Building your workbook…" : "Download Excel (.xlsx)"}
            </button>
            {phase === "done" ? <span className="text-sm text-emerald-600">Downloaded: {message}</span> : null}
            {phase === "error" ? <span className="text-sm text-rose-600">{message}</span> : null}
            {phase === "working" ? <span className="text-sm text-muted-foreground">Please keep this tab open.</span> : null}
          </div>
          <p className="text-xs text-muted-foreground">Limited to 4 downloads per hour. Each file is stamped with an export ID and the date it was generated.</p>
        </div>
      </Panel>

      <Panel title="What's inside" subtitle="Every tab, grouped by topic. The workbook opens on a branded cover and a clickable Contents sheet.">
        <div className="grid gap-4 md:grid-cols-2">
          {GROUPS.map((g) => (
            <div key={g.title} className="rounded-lg border border-border bg-card p-4">
              <p className="flex items-center gap-2 font-semibold">
                <FileSpreadsheet className="size-4 text-primary" />
                {g.title}
              </p>
              <p className="text-xs text-muted-foreground">{g.blurb}</p>
              <ul className="mt-3 space-y-2.5">
                {g.sheets.map(([name, desc]) => (
                  <li key={name} className="text-sm">
                    <span className="font-medium">{name}</span>
                    <span className="block text-muted-foreground">{desc}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="What isn't included, and why" subtitle="We'd rather tell you than pad the file.">
        <ul className="space-y-2 text-sm">
          {NOT_INCLUDED.map(([t, d]) => (
            <li key={t}>
              <span className="font-medium">{t}.</span> <span className="text-muted-foreground">{d}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">If a source was unreachable at the moment of export, the Export Log sheet inside the workbook says so.</p>
      </Panel>
    </div>
  );
}
