"use client";

import { useState } from "react";
import { PageHeader, Panel } from "@/components/layout/page-header";
import {
  buildSiteWideExecutiveBrief,
  type SiteWideExecutiveBrief,
  type IntelligencePillarSneakPeek,
} from "@/lib/brief/site-wide-brief";
import type { Brief } from "@/lib/brief/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import useSWR from "swr";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Layers,
  Building2,
  ShieldCheck,
  Activity,
  FileText,
  PieChart,
  Users,
  Flame,
  Coins,
  BarChart3,
  ArrowRight,
  ExternalLink,
  Clock,
  CheckCircle2,
  Mail,
  Compass,
  Briefcase,
  AlertTriangle,
} from "lucide-react";

type Payload = {
  briefs: (Brief & { id: number })[];
  siteWideBrief?: SiteWideExecutiveBrief;
  subscription: { pre: boolean; post: boolean } | null;
  canSubscribe: boolean;
  dbConfigured: boolean;
};

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then((r) => r.json() as Promise<Payload>);

const PILLAR_ICONS: Record<string, React.ElementType> = {
  "broker-consensus": Building2,
  "promoter-insider": ShieldCheck,
  "credit-risk": Activity,
  "company-concall": FileText,
  "mutual-funds": PieChart,
  "retail-sentiment": Flame,
  "macro-liquidity": Coins,
  "options-derivatives": BarChart3,
  "ipo-pipeline": Briefcase,
  "legal-regulatory": AlertTriangle,
};

export default function DailyBriefPage() {
  const { data, mutate } = useSWR<Payload>("/api/brief", fetcher, {
    refreshInterval: 300_000,
  });

  const [activeTab, setActiveTab] = useState<"all" | "institutional" | "promoters" | "funds" | "macro">("all");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Fallback to locally computed site-wide brief if API has not yet returned
  const executiveBrief = data?.siteWideBrief ?? buildSiteWideExecutiveBrief();

  async function save(pre: boolean, post: boolean) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pre, post }),
      });
      setBusy(false);
      setMsg(
        res.ok
          ? pre || post
            ? "Subscribed successfully."
            : "Unsubscribed."
          : (await res.json()).error ?? "Subscription request failed"
      );
      mutate();
    } catch {
      setBusy(false);
      setMsg("Unable to save subscription preferences.");
    }
  }

  const filteredPillars = executiveBrief.pillars.filter((p) => {
    if (activeTab === "all") return true;
    if (activeTab === "institutional") return p.id === "broker-consensus" || p.id === "company-concall";
    if (activeTab === "promoters") return p.id === "promoter-insider" || p.id === "credit-risk" || p.id === "legal-regulatory";
    if (activeTab === "funds") return p.id === "mutual-funds" || p.id === "retail-sentiment";
    if (activeTab === "macro") return p.id === "macro-liquidity" || p.id === "options-derivatives" || p.id === "ipo-pipeline";
    return true;
  });

  const pulse = executiveBrief.macroPulse;

  return (
    <div className="space-y-8 max-w-[1240px] mx-auto pb-20 px-2 sm:px-4">
      {/* 1. Header with Live Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Site-Wide Intelligence Briefing
            </span>
            <span className="text-xs text-muted-foreground">
              10 Real-Time Data Engines Synced
            </span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Executive Daily Brief & Site-Wide Radar
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl leading-relaxed">
            A comprehensive, multi-pillar briefing synthesizing live institutional research, promoter accumulation, rating agency actions, earnings concall tone, mutual fund X-rays, and macro liquidity.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
          <div className="rounded-xl border border-border/70 bg-card p-3 shadow-sm text-right">
            <span className="text-[11px] text-muted-foreground block">Trading Session</span>
            <span className="text-xs font-bold text-foreground tabular-nums flex items-center gap-1.5 justify-end">
              <Clock className="size-3.5 text-primary" />
              {executiveBrief.displayDate}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Executive Synthesis Hero Card */}
      <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/20 p-5 sm:p-7 shadow-sm space-y-5 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 px-2.5 py-1 text-xs font-bold uppercase tracking-wider">
              {executiveBrief.stance} Market Posture ({executiveBrief.stanceScore}/100)
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Generated twice daily · Pre-market ~8:15 IST & Post-close ~16:00 IST
            </span>
          </div>
          <span className="text-xs font-semibold text-primary flex items-center gap-1">
            <Sparkles className="size-3.5" />
            Grounded across 10 intelligence pipelines
          </span>
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-snug tracking-tight">
            {executiveBrief.executiveHeadline}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {executiveBrief.executiveSummary}
          </p>
        </div>

        {/* Macro Vital Signs Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 pt-4 border-t border-border/50">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 space-y-0.5">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">NIFTY 50</span>
            <span className="text-sm font-bold text-foreground tabular-nums block">{pulse.nifty.val}</span>
            <span className="text-[11px] font-semibold text-emerald-600 tabular-nums">{pulse.nifty.chg}</span>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 space-y-0.5">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">SENSEX</span>
            <span className="text-sm font-bold text-foreground tabular-nums block">{pulse.sensex.val}</span>
            <span className="text-[11px] font-semibold text-emerald-600 tabular-nums">{pulse.sensex.chg}</span>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 space-y-0.5">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">India VIX</span>
            <span className="text-sm font-bold text-foreground tabular-nums block">{pulse.indiaVix.val}</span>
            <span className="text-[11px] font-medium text-emerald-600 tabular-nums">{pulse.indiaVix.chg}</span>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 space-y-0.5">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">FII Net Cash</span>
            <span className="text-sm font-bold text-emerald-600 tabular-nums block">{pulse.fiiNetCr.val}</span>
            <span className="text-[10px] text-muted-foreground">Exchange provisional</span>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 space-y-0.5">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">DII Net Cash</span>
            <span className="text-sm font-bold text-emerald-600 tabular-nums block">{pulse.diiNetCr.val}</span>
            <span className="text-[10px] text-muted-foreground">Mutual funds / Ins</span>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 space-y-0.5">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Brent Crude</span>
            <span className="text-sm font-bold text-foreground tabular-nums block">{pulse.brentCrude.val}</span>
            <span className="text-[11px] font-medium text-emerald-600 tabular-nums">{pulse.brentCrude.chg}</span>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 space-y-0.5">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">10Y G-Sec</span>
            <span className="text-sm font-bold text-foreground tabular-nums block">{pulse.gsec10Y.val}</span>
            <span className="text-[10px] text-muted-foreground">Benchmark yield</span>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 space-y-0.5">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">RBI Liquidity</span>
            <span className="text-sm font-bold text-emerald-600 tabular-nums block">{pulse.rbiLiquidity.val}</span>
            <span className="text-[10px] text-muted-foreground">{pulse.rbiLiquidity.status}</span>
          </div>
        </div>
      </div>

      {/* 3. Site-Wide Intelligence Sneak Peek Section (10 Pillars) */}
      <section className="space-y-4" aria-labelledby="sneak-peek-heading">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
          <div>
            <h2 id="sneak-peek-heading" className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Compass className="size-4 text-primary" />
              Site-Wide Intelligence Sneak Peek (10 Streams)
            </h2>
            <p className="text-xs text-muted-foreground">
              Direct snapshot into every core intelligence engine across Market Intelligence. Jump into any specialized module for deep dossiers.
            </p>
          </div>

          {/* Stream Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
            <button
              onClick={() => setActiveTab("all")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all",
                activeTab === "all"
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              All 10 Streams
            </button>
            <button
              onClick={() => setActiveTab("institutional")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all",
                activeTab === "institutional"
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              Brokers & Concalls
            </button>
            <button
              onClick={() => setActiveTab("promoters")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all",
                activeTab === "promoters"
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              Promoters & Credit
            </button>
            <button
              onClick={() => setActiveTab("funds")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all",
                activeTab === "funds"
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              MF X-Ray & Reddit
            </button>
            <button
              onClick={() => setActiveTab("macro")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all",
                activeTab === "macro"
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              Macro, F&O & IPOs
            </button>
          </div>
        </div>

        {/* 10 Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredPillars.map((pillar) => {
            const Icon = PILLAR_ICONS[pillar.id] ?? Sparkles;
            return (
              <div
                key={pillar.id}
                className="group rounded-xl border border-border/80 bg-card p-5 space-y-4 hover:border-primary/50 transition-all duration-200 shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-3.5">
                  {/* Card Header: Category & Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          {pillar.category}
                        </span>
                        <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          {pillar.title}
                        </h3>
                      </div>
                    </div>

                    <span
                      className={cn(
                        "text-[11px] font-bold px-2 py-0.5 rounded-md border shrink-0",
                        pillar.badgeColor === "emerald" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-600",
                        pillar.badgeColor === "blue" && "bg-sky-500/10 border-sky-500/20 text-sky-600",
                        pillar.badgeColor === "violet" && "bg-purple-500/10 border-purple-500/20 text-purple-600",
                        pillar.badgeColor === "amber" && "bg-amber-500/10 border-amber-500/20 text-amber-600"
                      )}
                    >
                      {pillar.badge}
                    </span>
                  </div>

                  {/* Headline & Summary */}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-foreground leading-snug">
                      {pillar.headline}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {pillar.summary}
                    </p>
                  </div>

                  {/* Key Metrics Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 border-y border-border/40 text-xs">
                    {pillar.metrics.map((m, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground block truncate">
                          {m.label}
                        </span>
                        <span
                          className={cn(
                            "font-bold tabular-nums block",
                            m.isPositive ? "text-emerald-600" : "text-foreground"
                          )}
                        >
                          {m.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Featured Entities Highlight */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                      Key Signals & Highlights:
                    </span>
                    <ul className="space-y-1">
                      {pillar.featuredEntities.map((e, idx) => (
                        <li
                          key={idx}
                          className="rounded-md bg-muted/20 px-2.5 py-1.5 text-xs flex items-start justify-between gap-2"
                        >
                          <div className="space-y-0.5">
                            {e.symbol ? (
                              <span className="font-bold text-foreground mr-1">
                                {e.symbol}:
                              </span>
                            ) : null}
                            <span className="text-muted-foreground">{e.keyFact}</span>
                          </div>
                          {e.sentiment ? (
                            <span
                              className={cn(
                                "text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 uppercase tabular-nums",
                                e.sentiment === "BULLISH" && "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30",
                                e.sentiment === "POSITIVE" && "bg-sky-500/15 text-sky-600 border border-sky-500/30",
                                e.sentiment === "NEUTRAL" && "bg-muted text-muted-foreground"
                              )}
                            >
                              {e.sentiment}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card Deep-Dive Action */}
                <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    Real-time dataset integrated
                  </span>
                  <Link
                    href={pillar.deepDiveUrl}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline transition-colors"
                  >
                    <span>{pillar.deepDiveLabel}</span>
                    <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Thematic Drivers (Why the Market is Moving) */}
      <section className="space-y-4" aria-labelledby="thematic-drivers">
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <div>
            <h3 id="thematic-drivers" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Cross-Asset Thematic Drivers
            </h3>
            <p className="text-xs text-muted-foreground">
              Synthesized catalysts driving sector rotations and institutional allocation this week.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">4 Active Drivers</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {executiveBrief.keyThemes.map((theme, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-border/70 bg-card p-4 space-y-2.5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-primary">{theme.theme}</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 border border-emerald-500/20">
                  {theme.stance}
                </span>
              </div>
              <h4 className="text-sm font-bold text-foreground leading-snug">
                {theme.headline}
              </h4>
              <ul className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
                {theme.bullets.map((b, bIdx) => (
                  <li key={bIdx} className="flex items-start gap-1.5">
                    <span className="text-primary mt-1">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex justify-end">
                <span>Source: {theme.sourcePillar}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. What to Watch Today & Regulator Headlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Watch Today Checklist */}
        <div className="rounded-xl border border-border/70 bg-card p-5 space-y-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              What to Watch in Today&apos;s Session
            </h3>
          </div>
          <ul className="space-y-2">
            {executiveBrief.watchToday.map((item, idx) => (
              <li
                key={idx}
                className="rounded-lg bg-muted/20 border border-border/40 p-2.5 text-xs text-foreground flex items-start gap-2 leading-relaxed"
              >
                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Regulator & Exchange Circulars */}
        <div className="rounded-xl border border-border/70 bg-card p-5 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">
                Official Regulatory Circulars Considered
              </h3>
            </div>
            <span className="text-[11px] text-muted-foreground">NSE · BSE · RBI · SEBI</span>
          </div>

          <ul className="divide-y divide-border/40">
            {executiveBrief.regulatorHeadlines.map((h, idx) => (
              <li key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-primary text-[11px] block">
                    [{h.source}]
                  </span>
                  <a
                    href={h.link}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-foreground hover:text-primary hover:underline transition-colors block leading-snug"
                  >
                    {h.title}
                  </a>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                  {h.timeAgo}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 6. Email Delivery Opt-In Panel */}
      <Panel
        title="Email Delivery Preferences"
        subtitle="Opt-in only. Pre-market ~8:15 IST and post-close ~16:00 IST delivered directly to your inbox."
      >
        {data?.canSubscribe ? (
          <div className="flex flex-wrap items-center gap-6 text-xs">
            <label className="inline-flex items-center gap-2 text-foreground font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={data.subscription?.pre ?? false}
                disabled={busy}
                onChange={(e) => save(e.target.checked, data.subscription?.post ?? false)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              Pre-Market Brief (~8:15 IST)
            </label>
            <label className="inline-flex items-center gap-2 text-foreground font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={data.subscription?.post ?? false}
                disabled={busy}
                onChange={(e) => save(data.subscription?.pre ?? false, e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              Post-Close Synthesis (~16:00 IST)
            </label>
            {msg ? <span className="text-xs text-primary font-medium">{msg}</span> : null}
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Sign in with a free account to receive morning and evening briefings in your inbox.</span>
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign In →
            </Link>
          </div>
        )}
      </Panel>

      {/* 7. Past Briefs Archive */}
      {data && data.briefs.length > 1 ? (
        <Panel title="Archived Historical Briefs" subtitle="Chronological log of past automated and editorially reviewed market briefings.">
          <ul className="divide-y divide-border/50 text-xs">
            {data.briefs.slice(1).map((b) => (
              <li key={b.id} className="py-2.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground uppercase">
                    {b.kind === "pre" ? "Pre-Market" : "Post-Close"}
                  </span>
                  <span className="font-medium text-foreground">{b.headline}</span>
                </div>
                <span className="text-muted-foreground tabular-nums shrink-0">
                  {new Date(b.generatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {/* Footnote Disclaimer */}
      <p className="text-xs text-muted-foreground leading-relaxed text-center max-w-3xl mx-auto border-t border-border/40 pt-4">
        Market Intelligence Daily Briefings are synthesized from real-time SEBI filings, exchange disclosures, broker equity notes, rating agency releases, and macro liquidity metrics. All figures are verified against underlying source feeds. Content is created strictly for institutional research and investor education, and does not constitute financial or investment advice.
      </p>
    </div>
  );
}
