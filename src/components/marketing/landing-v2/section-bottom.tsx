"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useMyPortfolio } from "@/hooks/use-my-portfolio";
import type { ProofSymbol } from "@/lib/marketing/landing-v2/copy";
import { formatIstTimestamp } from "@/lib/marketing/landing-v2/format";
import { mergeLandingViewpoints, type LandingViewpointId } from "@/lib/marketing/landing-v2/landing-ai-desk-map";
import { trustReceiptRows } from "@/lib/marketing/landing-v2/live-narratives";
import { MARKETING_PLAN_SAVINGS, MARKETING_PLUS_LAUNCH_ACTIVE } from "@/lib/marketing/pricing-marketing";
import { PLUS_LAUNCH_OFFER_NOTE } from "@/lib/payments/plans";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useLandingAiDesk, useLandingDashboard, useLandingResearch, useLandingSiteBrief } from "./use-landing-data";
import { BodyCopy, PrimaryButton, SecondaryButton, SectionTitle, SourceLine } from "./ui";

export function LandingUseCasesSection() {
  const cards = [
    {
      title: "Research a company before you buy",
      body: "Price history, valuation, risk flags, sourced news, and an AI brief you can sanity-check.",
      href: "#proof",
      cta: "Try it →",
    },
    {
      title: "See the whole market on one board",
      body: "Stocks, currencies, bonds, global indices, macro, and sector signals — with the links between them explained.",
      href: "#markets",
      cta: "Open the board →",
    },
    {
      title: "Test ideas without risking money",
      body: "A practice portfolio, backtests on past data, and five AI analysts to challenge your thinking.",
      href: "#ai-desk",
      cta: "Meet the desk →",
    },
  ];
  return (
    <section id="uses" className="scroll-mt-16 border-b border-[#dcd6cc] px-5 py-16">
      <div className="mx-auto max-w-6xl">
        <SectionTitle>Three things people use it for.</SectionTitle>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {cards.map((c) => (
            <article key={c.title} className="border border-[#dcd6cc] bg-[#faf7f2] p-5">
              <h3 className="text-lg font-semibold text-[#141414]">{c.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#3d3d3d]">{c.body}</p>
              <a href={c.href} className="mt-4 inline-block text-sm font-semibold text-[#b84624] underline underline-offset-4">
                {c.cta}
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingAiDeskSection() {
  const demoSymbol: ProofSymbol = "RELIANCE";
  const { desk, loading: deskLoading } = useLandingAiDesk(demoSymbol);
  const { research, loading: researchLoading } = useLandingResearch(demoSymbol);
  const viewpoints = useMemo(() => mergeLandingViewpoints(desk, research), [desk, research]);
  const [view, setView] = useState<LandingViewpointId>("fundamentals");
  const active = viewpoints.find((v) => v.id === view) ?? viewpoints[0];
  const loading = deskLoading && researchLoading && !viewpoints.some((v) => v.body);
  const modeLabel = desk ? "Live AI desk" : research ? "Live research signals" : "Live desk";
  return (
    <section id="ai-desk" className="scroll-mt-16 border-b border-[#dcd6cc] px-5 py-16">
      <div className="mx-auto max-w-6xl">
        <SectionTitle>Ask five AI analysts about any stock.</SectionTitle>
        <BodyCopy className="mt-4 max-w-3xl">
          Fundamentals, sentiment, technicals, a bull, and a bear argue with cited evidence. A risk manager gives the final word.
        </BodyCopy>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-[#6b6b6b]">AI analyst viewpoints</p>
        <div className="mt-3 flex flex-wrap gap-2" role="tablist">
          {viewpoints.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={view === v.id}
              onClick={() => setView(v.id)}
              className="rounded-none border border-[#dcd6cc] bg-[#faf7f2] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide data-[active=true]:border-[#141414] data-[active=true]:bg-[#141414] data-[active=true]:text-white"
              data-active={view === v.id ? "true" : "false"}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="mt-6 border border-[#dcd6cc] bg-[#faf7f2] p-6" role="tabpanel">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6b6b6b]">
            {modeLabel} · {demoSymbol}
            {desk?.asOf
              ? ` · ${formatIstTimestamp(desk.asOf)}`
              : research?.fetchedAt
                ? ` · ${formatIstTimestamp(research.fetchedAt)}`
                : ""}
          </p>
          {loading ? <p className="mt-4 text-sm text-[#6b6b6b]">Loading live preview…</p> : null}
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#6b6b6b]">Confidence {active.confidence}</p>
          <p className="mt-4 text-[17px] leading-relaxed text-[#141414]">{active.body || "—"}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {active.evidence.map((chip) => (
              <span key={chip} className="border border-[#dcd6cc] px-2 py-1 text-xs text-[#3d3d3d]">
                {chip}
              </span>
            ))}
          </div>
        </div>
        <p className="mt-4 text-sm text-[#6b6b6b]">
          It tells you when it is unsure. Confidence scores are the model&apos;s own estimate, not a guarantee. Research only —
          never advice.
        </p>
      </div>
    </section>
  );
}

function metricValue(analysis: NonNullable<ReturnType<typeof useMyPortfolio>["data"]>, id: string): string {
  const row = analysis.overview.find((m) => m.id === id);
  if (!row || row.formatted === "—") return "—";
  return row.formatted;
}

export function LandingPortfolioSection() {
  const { user } = useAuth();
  const { data: analysis, holdings } = useMyPortfolio();
  const hasPortfolio = Boolean(user && holdings.length && analysis?.hasHoldings);
  return (
    <section id="portfolio" className="scroll-mt-16 border-b border-[#dcd6cc] px-5 py-16">
      <div className="mx-auto max-w-6xl">
        <SectionTitle>Bring your portfolio. See what it&apos;s really doing.</SectionTitle>
        <BodyCopy className="mt-4 max-w-3xl">
          Import from Zerodha, Upstox, or Dhan — or paste a CSV. Sharpe, beta, VaR, and attribution come with plain-English
          definitions.
        </BodyCopy>
        <div className="mt-8 border border-[#dcd6cc] bg-[#faf7f2] p-6">
          {hasPortfolio && analysis ? (
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b6b6b]">Return</p>
                <p className="text-lg font-semibold tabular-nums">{metricValue(analysis, "totalReturn")}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b6b6b]">Sharpe</p>
                <p className="text-lg font-semibold tabular-nums">{metricValue(analysis, "sharpe")}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b6b6b]">Beta</p>
                <p className="text-lg font-semibold tabular-nums">{metricValue(analysis, "beta")}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b6b6b]">1D VaR</p>
                <p className="text-lg font-semibold tabular-nums">{metricValue(analysis, "var1d")}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#3d3d3d]">Sign in and import holdings to see live risk and attribution here — no sample numbers on this page.</p>
          )}
          <Link href="/portfolio" className="mt-6 inline-block text-sm font-semibold text-[#b84624] underline underline-offset-4">
            Connect your holdings →
          </Link>
        </div>
      </div>
    </section>
  );
}

export function LandingAlertsSection() {
  const brief = useLandingSiteBrief();
  const headline = brief?.executiveHeadline ?? "";
  const watch = brief?.watchToday?.[0] ?? "";
  const filing = brief?.regulatorHeadlines?.[0];
  return (
    <section id="alerts" className="scroll-mt-16 border-b border-[#dcd6cc] px-5 py-16">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2 md:items-center">
        <div>
          <SectionTitle>The market on your phone, before the noise.</SectionTitle>
          <BodyCopy className="mt-4">
            Breaking catalysts and a morning brief on Telegram. One tap to connect. Free.
          </BodyCopy>
          <PrimaryButton href="/profile#telegram" className="mt-6">
            Connect Telegram
          </PrimaryButton>
        </div>
        <div className="border border-[#dcd6cc] bg-[#faf7f2] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b6b6b]">Telegram · Market brief</p>
          <div className="mt-4 space-y-3 text-sm text-[#3d3d3d]">
            <div className="border border-[#dcd6cc] p-3">
              <p className="font-semibold text-[#141414]">{headline || "Morning brief"}</p>
              <p className="mt-1">{watch || brief?.executiveSummary?.slice(0, 120) || "—"}</p>
              <p className="mt-2 text-xs text-[#6b6b6b]">
                {brief?.displayDate ?? "—"} · {brief?.marketSession?.replace("_", " ") ?? "live brief"}
              </p>
            </div>
            <div className="border border-[#dcd6cc] p-3">
              <p className="font-semibold text-[#141414]">{filing?.title || "Regulator headline"}</p>
              <p className="mt-1">{filing?.source || "—"}</p>
              <p className="mt-2 text-xs text-[#6b6b6b]">{filing?.timeAgo ?? "—"}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingMacroSection() {
  const { dashboard } = useLandingDashboard();
  const macro = dashboard?.indiaMacro ?? [];
  const repo = macro.find((m) => /repo|policy/i.test(m.indicator));
  const fii = dashboard?.moneyFlow?.fii?.today;
  const pulse = dashboard?.pulse;
  const links = [
    {
      title: repo?.indicator ?? "RBI policy rate",
      sub: repo?.current != null ? `${repo.current}${repo.unit === "%" ? "%" : ""}` : "WHY IT MATTERS →",
      href: "/macro/rbi",
    },
    {
      title: "Foreign flows",
      sub: fii != null ? `FII ${fii >= 0 ? "+" : ""}${Math.round(fii)} Cr today` : "FOLLOW THE MONEY →",
      href: "/macro/india",
    },
    {
      title: "Oil & the rupee",
      sub:
        pulse?.usdInr?.value != null && pulse?.brent?.value != null
          ? `₹${pulse.usdInr.value.toFixed(2)} · Brent ${pulse.brent.value.toFixed(1)}`
          : "READ THE LINK →",
      href: "/macro/currency",
    },
  ];
  return (
    <section className="border-b border-[#dcd6cc] px-5 py-16">
      <div className="mx-auto max-w-6xl">
        <SectionTitle>The big picture, without the PhD.</SectionTitle>
        <BodyCopy className="mt-4 max-w-2xl">
          RBI rates, inflation, FII/DII flows, crude, and the rupee — explained on one page.
        </BodyCopy>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="border border-[#dcd6cc] bg-[#faf7f2] p-4 transition hover:border-[#141414]/30">
              <p className="font-semibold text-[#141414]">{l.title}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-[#b84624]">{l.sub}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingTrustSection() {
  const { dashboard } = useLandingDashboard();
  const fetchedAt = dashboard?.fetchedAt ?? "";
  const receipts = trustReceiptRows(dashboard, fetchedAt);
  const [open, setOpen] = useState(true);
  return (
    <section id="trust" className="scroll-mt-16 border-b border-[#dcd6cc] px-5 py-16">
      <div className="mx-auto max-w-6xl">
        <SectionTitle>We show our work. Most terminals don&apos;t.</SectionTitle>
        <BodyCopy className="mt-4 max-w-3xl">
          Every figure carries its source and fetch time. Estimates are labelled. Missing data stays blank — never guessed.
        </BodyCopy>
        <div className="mt-8 border border-[#dcd6cc] bg-[#faf7f2]">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-[#141414]"
          >
            Data receipt
            <span aria-hidden>{open ? "−" : "+"}</span>
          </button>
          {open ? (
            <table className="w-full border-t border-[#dcd6cc] text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[#6b6b6b]">
                  <th className="px-4 py-2">Figure</th>
                  <th className="px-4 py-2">Source</th>
                  <th className="px-4 py-2">Fetched</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((row) => (
                  <tr key={row.figure} className="border-t border-[#dcd6cc]">
                    <td className="px-4 py-2">{row.figure}</td>
                    <td className="px-4 py-2">{row.source || "—"}</td>
                    <td className="px-4 py-2">{formatIstTimestamp(row.fetched)} IST</td>
                    <td className="px-4 py-2">{row.ok ? "Source attached" : "unavailable"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
        <ul className="mt-8 space-y-4 text-sm text-[#3d3d3d]">
          <li>
            <span className="font-semibold text-[#141414]">Source beside the number</span> — No hunt through footnotes to find out
            where a figure came from.
          </li>
          <li>
            <span className="font-semibold text-[#141414]">Time beside the source</span> — You can see whether the information is
            fresh enough for the question.
          </li>
          <li>
            <span className="font-semibold text-[#141414]">A blank when the feed fails</span> — No silent fallback to a made-up
            number.
          </li>
        </ul>
      </div>
    </section>
  );
}

export function LandingPricingSection() {
  const [yearly, setYearly] = useState(false);
  return (
    <section id="pricing" className="scroll-mt-16 border-b border-[#dcd6cc] px-5 py-16">
      <div className="mx-auto max-w-6xl">
        <SectionTitle>Start free. Pay only when it earns it.</SectionTitle>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-[#6b6b6b]">Billing period</p>
        <div className="mt-2 inline-flex border border-[#dcd6cc]">
          <button
            type="button"
            onClick={() => setYearly(false)}
            className={`px-4 py-2 text-sm font-semibold ${!yearly ? "bg-[#141414] text-white" : "bg-[#faf7f2]"}`}
          >
            Plus plan
          </button>
          <button
            type="button"
            onClick={() => setYearly(true)}
            className={`px-4 py-2 text-sm font-semibold ${yearly ? "bg-[#141414] text-white" : "bg-[#faf7f2]"}`}
          >
            Pro plan
          </button>
        </div>
        {MARKETING_PLUS_LAUNCH_ACTIVE ? (
          <p className="mt-4 text-sm text-[#0d6b5c]">{PLUS_LAUNCH_OFFER_NOTE}</p>
        ) : null}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="border border-[#dcd6cc] bg-[#faf7f2] p-5">
            <p className="font-semibold">Free</p>
            <p className="mt-2 text-2xl font-semibold">₹0</p>
            <p className="mt-2 text-sm text-[#3d3d3d]">The whole website. 5 AI analyses a month. Claude MCP is paid-only.</p>
            <PrimaryButton href="/signup" className="mt-6 w-full">
              Start free
            </PrimaryButton>
          </div>
          <div className="border border-[#dcd6cc] bg-[#faf7f2] p-5">
            <p className="font-semibold">Daily pass</p>
            <p className="mt-2 text-2xl font-semibold">₹9</p>
            <p className="mt-1 text-sm text-[#6b6b6b]">, one time</p>
            <p className="mt-2 text-sm text-[#3d3d3d]">Everything including Claude MCP, for one full day.</p>
            <SecondaryButton href="/pricing" className="mt-6 w-full">
              Choose daily pass
            </SecondaryButton>
          </div>
          <div className="border-2 border-[#141414] bg-[#faf7f2] p-5">
            <p className="font-semibold">{yearly ? "Pro plan" : "Plus plan"}</p>
            <p className="mt-2 text-2xl font-semibold">{yearly ? "₹999 / year" : "₹99 / month"}</p>
            <p className="mt-2 text-sm text-[#3d3d3d]">
              {yearly
                ? MARKETING_PLAN_SAVINGS
                : MARKETING_PLUS_LAUNCH_ACTIVE
                  ? "3 months access if you subscribe by 31 Oct 2026."
                  : "Unlimited access including Claude MCP. Cancel any time."}
            </p>
            <PrimaryButton href="/pricing" className="mt-6 w-full">
              {yearly ? "Choose Pro plan" : "Choose Plus plan"}
            </PrimaryButton>
          </div>
        </div>
        <p className="mt-8 text-sm text-[#3d3d3d]">
          What happens next / Instant / You get access the moment payment confirms.{" "}
          <Link href="/methodology" className="font-semibold text-[#141414] underline underline-offset-4">
            See methodology
          </Link>
        </p>
        <p className="mt-6 text-sm text-[#6b6b6b]">
          Paid plan? Ask Claude Desktop about the market through the MCP connector, or pull data into your own terminal.{" "}
          <Link href="/connect/claude" className="font-semibold text-[#141414] underline underline-offset-4">
            Connect →
          </Link>
        </p>
      </div>
    </section>
  );
}

export function LandingFounderSection() {
  return (
    <section id="founder" className="scroll-mt-16 px-5 py-16">
      <div className="mx-auto max-w-3xl border border-[#dcd6cc] bg-[#faf7f2] p-8 text-center">
        <p className="text-[17px] leading-relaxed text-[#3d3d3d]">
          &ldquo;I built this because terminals felt cluttered, overpriced, and opaque. You deserve the same data the pros see —
          with the sources attached.&rdquo;
        </p>
        <p className="mt-4 text-sm font-semibold text-[#141414]">— Debabrata, founder</p>
        <SectionTitle className="mt-12">The market won&apos;t wait for you to feel ready. Start learning it free.</SectionTitle>
        <PrimaryButton href="/signup" className="mt-6">
          Start free — no card needed
        </PrimaryButton>
      </div>
    </section>
  );
}

export function LandingFooter() {
  const jumps = [
    { href: "#hero", label: "Hero" },
    { href: "#proof", label: "Demo" },
    { href: "#uses", label: "Uses" },
    { href: "#ai-desk", label: "AI desk" },
    { href: "#markets", label: "Markets" },
    { href: "#portfolio", label: "Portfolio" },
    { href: "#alerts", label: "Alerts" },
    { href: "#trust", label: "Trust" },
    { href: "#pricing", label: "Pricing" },
    { href: "#founder", label: "Founder" },
  ];
  return (
    <footer className="border-t border-[#dcd6cc] px-5 py-10">
      <div className="mx-auto max-w-6xl text-sm text-[#6b6b6b]">
        <p className="font-semibold text-[#141414]">Research tools for Indian markets</p>
        <p className="mt-2">Data can be delayed · Research only, never investment advice</p>
        <p className="mt-4 font-semibold text-[#141414]">Jump to section:</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {jumps.map((j) => (
            <a key={j.href} href={j.href} className="underline underline-offset-4 hover:text-[#141414]">
              {j.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
