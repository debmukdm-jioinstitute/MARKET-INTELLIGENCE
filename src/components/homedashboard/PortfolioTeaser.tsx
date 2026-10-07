"use client";
import { Star } from "lucide-react";
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
      <div className={cardClass}>
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
                <p className="mt-1 text-sm text-[#5f6368]">
                  Prices move. We’ll remember them for you.
                </p>
                {!locked && !data ? (
                  <p className="mt-1 text-xs text-[#5f6368]">
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
          <>
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="text-xs text-[#5f6368]">Total portfolio value</p>
                <p className="mt-1 text-2xl font-semibold text-stone-900">
                  {rupees(data.navInr)}
                </p>
                <p
                  className={`mt-2 text-sm ${data.todayPnlInr >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {data.todayPnlInr >= 0 ? "+" : "−"}
                  {rupees(data.todayPnlInr)} today · your book{" "}
                  {data.todayPnlInr >= 0 ? "gained" : "lost"} value
                </p>
              </div>
              <HomeLink href="/portfolio">Open your portfolio</HomeLink>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {positions.map((p) => (
                <div key={p.id} className="rounded-xl bg-stone-50 p-3">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-stone-900">
                      {p.symbol}
                    </span>
                    <span className="text-stone-700">
                      {rupees(p.marketValueInr)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#5f6368]">
                    {(p.weight * 100).toFixed(1)}% of your portfolio
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
