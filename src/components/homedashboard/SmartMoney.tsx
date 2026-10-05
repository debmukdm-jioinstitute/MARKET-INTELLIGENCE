import type { IndiaDashboardPayload } from "@/lib/feeds/india/types";
import { flowInsight } from "@/lib/homedashboard/insights";
import { DataInfo } from "@/components/feeds/data-info";
import { cardClass, HomeLink, SectionHeading } from "./shared";

export function SmartMoney({ data }: { data: IndiaDashboardPayload | null }) {
  return (
    <section aria-label="Smart Money">
      <SectionHeading
        title="Where is the big money going?"
        detail="Foreign and domestic institutions. Look for the pattern, not just the number."
        action={
          <HomeLink href="/intelligence/institutional">
            Follow the money
          </HomeLink>
        }
      />
      <div className={`${cardClass} divide-y divide-stone-100`}>
        {(["fii", "dii"] as const).map((key) => {
          const row = data?.moneyFlow[key];
          const value = row?.today;
          return (
            <article key={key} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-stone-900">
                      {key === "fii"
                        ? "FII · Foreign institutions"
                        : "DII · Domestic institutions"}
                    </h3>
                    {row?.source ? (
                      <DataInfo
                        source={row.source}
                        name={key === "fii" ? "FII Cash Flow" : "DII Cash Flow"}
                        hubSyncedAt={data?.fetchedAt}
                      />
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-stone-500">
                    {row?.source.asOf
                      ? `Reported ${row.source.asOf}`
                      : "Latest cash-market report"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-lg font-semibold text-stone-900 tabular-nums">
                    {value != null
                      ? `${value >= 0 ? "+" : "−"}₹${Math.abs(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })} cr`
                      : "—"}
                  </p>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-semibold ${value == null || value === 0 ? "bg-stone-100 text-stone-500" : value > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
                  >
                    {value == null
                      ? "Unavailable"
                      : value > 0
                        ? "Net buying"
                        : value < 0
                          ? "Net selling"
                          : "Flat"}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm text-stone-500">
                {flowInsight(
                  key === "fii" ? "FIIs" : "DIIs",
                  row?.history,
                  value,
                )}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
