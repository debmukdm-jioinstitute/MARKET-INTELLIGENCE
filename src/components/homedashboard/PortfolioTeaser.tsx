"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Star } from "lucide-react";
import type { useMyPortfolio } from "@/hooks/use-my-portfolio";
import { cardClass, HomeLink, rupees, SectionHeading } from "./shared";
import { homeActions } from "./useHomeProgress";

/** Share MyPortfolioCard's existing hook/model; no second portfolio request or valuation engine. */
export function PortfolioTeaser({
  portfolio,
}: {
  portfolio: ReturnType<typeof useMyPortfolio>;
}) {
  const { locked, data } = portfolio;
  const positions = [...(data?.positions ?? [])]
    .sort((a, b) => b.marketValueInr - a.marketValueInr)
    .slice(0, 3);
  return (
    <section aria-label="Your stocks">
      <SectionHeading
        title="Your stocks"
        detail="Bring the market back to what matters to you."
      />
      <div
        className={
          locked || !data?.hasHoldings
            ? cardClass
            : "rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8"
        }
      >
        {locked || !data?.hasHoldings ? (
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-600">
                <Star className="size-5" />
              </span>
              <div>
                <h3 className="font-semibold text-stone-900">
                  Track your first stock
                </h3>
                <p className="mt-1 text-sm text-stone-500">
                  Prices move. We’ll remember them for you.
                </p>
                {!locked && !data ? (
                  <p className="mt-1 text-xs text-stone-500">
                    Portfolio values are unavailable right now.
                  </p>
                ) : null}
              </div>
            </div>
            <HomeLink
              href="/portfolio/watchlist"
              onClick={homeActions.trackStock}
            >
              Create a free watchlist
            </HomeLink>
          </div>
        ) : (
          <PortfolioSummary data={data} positions={positions} />
        )}
      </div>
    </section>
  );
}

const DOTS = ["#4f8ef7", "#a67cf0", "#f0b43c"];
const OTHER = "#c3cbd6";

type Portfolio = NonNullable<ReturnType<typeof useMyPortfolio>["data"]>;

function PortfolioSummary({
  data,
  positions,
}: {
  data: Portfolio;
  positions: Portfolio["positions"];
}) {
  const [hidden, setHidden] = useState(false);
  const mask = (v: string) => (hidden ? "₹ ••••••" : v);
  const pnl = data.todayPnlInr;
  const topPct = positions.reduce((t, p) => t + p.weight * 100, 0);
  const otherPct = Math.max(0, 100 - topPct);
  const segments = [
    ...positions.map((p, i) => ({
      key: p.id,
      label: p.symbol,
      pct: p.weight * 100,
      color: DOTS[i],
    })),
    ...(otherPct > 0.05
      ? [{ key: "other", label: "Other", pct: otherPct, color: OTHER }]
      : []),
  ];
  return (
    <>
      <div className="grid gap-8 md:grid-cols-2 md:gap-0">
        <div className="md:pr-10">
          <div className="flex items-center gap-3 text-stone-500">
            <span className="text-base">Portfolio value</span>
            <button
              type="button"
              onClick={() => setHidden((h) => !h)}
              aria-label={hidden ? "Show portfolio value" : "Hide portfolio value"}
              className="rounded-md p-1 text-stone-900 hover:bg-stone-100"
            >
              {hidden ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
          <p className="mt-3 text-5xl font-extrabold tracking-tight text-black sm:text-6xl">
            {mask(rupees(data.navInr))}
          </p>
          <p
            className={`mt-2 text-lg ${pnl === 0 ? "text-stone-600" : pnl > 0 ? "text-emerald-600" : "text-rose-600"}`}
          >
            {pnl === 0
              ? "₹0 today · Unchanged"
              : `${pnl > 0 ? "+" : "−"}${mask(rupees(pnl))} today`}
          </p>
          <Link
            prefetch={false}
            href="/portfolio"
            className="mt-6 inline-flex h-14 items-center gap-3 rounded-full bg-black px-8 text-lg font-medium text-white transition-colors hover:bg-stone-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
          >
            Open portfolio
            <ArrowRight aria-hidden className="size-5" />
          </Link>
          <p className="mt-4 text-base text-stone-500">
            Top {positions.length} holdings make up {Math.round(topPct)}% of
            your portfolio.
          </p>
        </div>
        <div className="md:border-l md:border-stone-200 md:pl-10">
          <h3 className="text-2xl font-bold text-black">Top holdings</h3>
          <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-x-6 border-b border-stone-200 pb-3 text-sm text-stone-500">
            <span>Holding</span>
            <span className="text-right">Value</span>
            <span className="w-14 text-right">Weight</span>
          </div>
          {positions.map((p, i) => (
            <div
              key={p.id}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 border-b border-stone-200 py-4 last:border-b-0"
            >
              <span className="flex items-center gap-4 text-lg font-semibold text-black">
                <span
                  aria-hidden
                  className="size-7 shrink-0 rounded-full"
                  style={{ background: DOTS[i] }}
                />
                {p.symbol}
              </span>
              <span className="text-right text-lg font-semibold tabular-nums text-black">
                {mask(rupees(p.marketValueInr))}
              </span>
              <span className="w-14 text-right text-lg font-semibold tabular-nums text-black">
                {(p.weight * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-8 border-t border-stone-200 pt-6">
        <div
          role="img"
          aria-label="Portfolio allocation"
          className="flex h-8 w-full overflow-hidden rounded-full"
        >
          {segments.map((s) => (
            <span
              key={s.key}
              style={{ width: `${s.pct}%`, background: s.color }}
            />
          ))}
        </div>
        <ul className="mt-5 flex flex-wrap gap-x-10 gap-y-3 text-base text-stone-700">
          {segments.map((s) => (
            <li key={s.key} className="flex items-center gap-3">
              <span
                aria-hidden
                className="size-6 rounded-full"
                style={{ background: s.color }}
              />
              <span className="font-medium text-black">{s.label}</span>
              <span className="tabular-nums">{s.pct.toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
