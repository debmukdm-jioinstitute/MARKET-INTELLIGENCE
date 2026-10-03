"use client";
import useSWR from "swr";
import {
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
  HomeLink,
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
        number="03 / YOUR NEXT MOVE"
        title="Five ways to find your edge"
        detail="Follow your curiosity. Every tool gives you somewhere useful to start."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((c) => (
          <article
            key={c.name}
            className="flex min-w-0 flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-colors hover:border-teal-300"
          >
            <span className="mb-5 grid size-10 place-items-center rounded-xl border border-teal-100 bg-teal-50 text-teal-600">
              <c.icon className="size-5" />
            </span>
            <h3 className="text-base font-semibold text-stone-900">{c.name}</h3>
            <p className="mt-2 min-h-10 text-sm leading-relaxed text-stone-500">
              {c.desc}
            </p>
            <div className="mb-4 mt-4 rounded-lg bg-stone-50 p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-teal-600">
                {c.live
                  ? "Latest available"
                  : "Explore · live teaser unavailable"}
              </p>
              <p className="text-xs font-medium leading-relaxed text-stone-700">
                {c.teaser}
              </p>
            </div>
            <div className="mt-auto">
              <HomeLink href={c.href} onClick={c.run}>
                {c.cta}
              </HomeLink>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
