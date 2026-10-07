import type { ResearchDetailPayload } from "@/lib/feeds/research-detail";
import { fmtChgPct, fmtInr } from "@/lib/format-india";
import { formatSeoDate } from "@/lib/seo/metadata";

export function SymbolSeoHeader({ data }: { data: ResearchDetailPayload }) {
  const q = data.upstoxQuote;
  const marketLabel = data.market === "IN" ? "NSE" : "US listing";
  const asOf = q?.asOf ?? data.fetchedAt;

  return (
    <header className="portal-page border-b border-border/60 pb-4">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
        {data.name} ({data.symbol}) — share price &amp; research
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {marketLabel} · updated {formatSeoDate(asOf)}
        {data.market === "IN" ? " · India quote via configured market feeds when available" : ""}
      </p>
      {q ? (
        <div className="mt-4 flex flex-wrap items-baseline gap-3">
          <p className="text-3xl font-bold tabular-nums">{fmtInr(q.ltp)}</p>
          <p className={`text-sm font-semibold tabular-nums ${q.netChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {q.netChange >= 0 ? "+" : ""}
            {fmtInr(q.netChange)} ({fmtChgPct(q.ltp - q.netChange ? q.netChange / (q.ltp - q.netChange) : 0)})
          </p>
        </div>
      ) : data.usDetail?.quote?.price != null ? (
        <p className="mt-4 text-3xl font-bold tabular-nums">
          {data.usDetail.quote.price.toLocaleString("en-US", {
            style: "currency",
            currency: data.usDetail.quote.currency || "USD",
          })}
        </p>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Quote unavailable — open the dossier below when feeds connect.</p>
      )}
      {data.fundamentals?.ratios?.length ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {data.fundamentals.ratios
            .filter((r) => r.companyValue != null)
            .slice(0, 3)
            .map((r) => `${r.name} ${r.companyValue}${r.unitSuffix}`)
            .join(" · ")}
        </p>
      ) : null}
    </header>
  );
}
