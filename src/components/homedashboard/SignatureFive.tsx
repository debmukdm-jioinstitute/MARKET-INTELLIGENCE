"use client";
import useSWR from "swr";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  FlaskConical,
  MessagesSquare,
  ScanLine,
  Waves,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { trendingSymbol, type BriefResponse } from "@/lib/homedashboard/brief";
import { isToday } from "@/lib/homedashboard/insights";
import type { PortfolioAnalysis } from "@/lib/my-portfolio/types";
import {
  fetchOptions,
  homeJson,
  rupees,
  SectionHeading,
} from "./shared";
import { homeActions } from "./useHomeProgress";

type ScannerTeaser = {
  run?: { asOf: string; lastBar: string } | null;
  scanners?: { id: string; matches: number }[];
};
type AlertTeaser = { rules?: { active: boolean }[]; canEdit?: boolean };
type OptionsTeaser = {
  flags?: { flagged_date: string }[];
  dbConfigured?: boolean;
};
export function SignatureFive({
  brief,
  portfolio,
  now,
}: {
  brief?: BriefResponse;
  portfolio: PortfolioAnalysis | null;
  now: Date | null;
}) {
  const { ready, isGuest, user } = useAuth();
  const { data: scanner } = useSWR<ScannerTeaser>(
    "/api/scanner",
    homeJson,
    fetchOptions,
  );
  const { data: alerts } = useSWR<AlertTeaser>(
    ready && user && !isGuest ? "/api/alerts" : null,
    homeJson,
    fetchOptions,
  );
  const { data: options } = useSWR<OptionsTeaser>(
    "/api/options-flow/history",
    homeJson,
    fetchOptions,
  );
  const trending = now ? trendingSymbol(brief, now) : null;
  const breakout = scanner?.scanners?.find((s) => s.id === "high52w");
  const scanToday = now && scanner?.run && isToday(scanner.run.lastBar, now);
  const alertCount = alerts?.rules?.filter((r) => r.active).length ?? 0;
  const optionCount = now
    ? options?.flags?.filter((f) => isToday(f.flagged_date, now)).length
    : undefined;
  const pnl = portfolio?.hasHoldings
    ? portfolio.positions.reduce((sum, p) => sum + p.pnlInr, 0)
    : null;
  const cards = [
    {
      name: "AI Desk",
      accent: ["#1a73e8", "#e8f0fe", "#174ea6"],
      icon: MessagesSquare,
      desc: "Five AI analysts debate a stock — bull vs bear, with sources.",
      teaser: trending
        ? `Trending debate today: ${trending}`
        : "Start a debate about NIFTY.",
      live: Boolean(trending),
      href: "/research/ai-desk",
      cta: "Hear both sides",
      run: () => homeActions.mission("open-debate"),
    },
    {
      name: "Stock Scanner",
      accent: ["#d93025", "#fce8e6", "#a50e0e"],
      icon: ScanLine,
      desc: "Find stocks breaking out right now.",
      teaser:
        breakout && scanToday
          ? `${breakout.matches} 52-week breakouts found in today’s scan`
          : "Scan the Nifty 500 in one click.",
      live: Boolean(breakout && scanToday),
      href: "/intelligence/scanner",
      cta: "Find your next idea",
      run: () => homeActions.mission("run-scan"),
    },
    {
      name: "Trade Lab",
      accent: ["#e37400", "#fef7e0", "#b06000"],
      icon: FlaskConical,
      desc: "Practise trading with real data. Zero risk.",
      teaser:
        pnl != null
          ? `Your virtual book P&L: ${pnl >= 0 ? "+" : "−"}${rupees(pnl)}`
          : "Start with ₹10,00,000 virtual cash.",
      live: pnl != null,
      href: "/intelligence/trade-lab",
      cta: "Try an idea",
      run: () => homeActions.bonus("paper-trader"),
    },
    {
      name: "Alerts",
      accent: ["#1e8e3e", "#e6f4ea", "#137333"],
      icon: BellRing,
      desc: "The market taps you on the shoulder.",
      teaser: alertCount
        ? `${alertCount} alerts watching the market for you`
        : "Get pinged when a stock breaks out.",
      live: alertCount > 0,
      href: "/intelligence/alerts?new=1",
      cta: alertCount ? "Manage your alerts" : "Set your first alert",
      run: () => homeActions.bonus("first-alert"),
    },
    {
      name: "Options Flow",
      accent: ["#9334e6", "#f3e8fd", "#7627bb"],
      icon: Waves,
      desc: "Follow the big options money.",
      teaser:
        options?.dbConfigured && optionCount != null
          ? `${optionCount}${optionCount === 60 ? "+" : ""} unusual option flags today`
          : "See where big options bets land.",
      live: Boolean(options?.dbConfigured && optionCount != null),
      href: "/research/options-flow",
      cta: "See the activity",
      run: undefined,
    },
  ];
  return (
    <section aria-label="The Signature Five">
      <SectionHeading
        title="Five ways to find your edge"
        detail="Follow your curiosity. Every tool gives you somewhere useful to start."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((c, i) => (
          <article
            key={c.name}
            className="g-card"
            style={
              {
                "--g-i": i,
                "--g-accent": c.accent[0],
                "--g-tint": c.accent[1],
                "--g-ink": c.accent[2],
              } as React.CSSProperties
            }
          >
            <span className="g-icon mb-6">
              <c.icon className="size-6" aria-hidden />
            </span>
            <h3 className="text-xl font-medium text-[#202124]">{c.name}</h3>
            <p className="mt-2 min-h-12 text-base leading-6 text-[#3c4043]">
              {c.desc}
            </p>
            <div className="g-chip my-5" data-live={c.live}>
              <span className="g-dot" aria-hidden />
              <span>{c.teaser}</span>
            </div>
            <div className="mt-auto">
              <Link
                prefetch={false}
                href={c.href}
                onClick={c.run}
                className="g-cta after:absolute after:inset-0 after:content-['']"
              >
                {c.cta}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
