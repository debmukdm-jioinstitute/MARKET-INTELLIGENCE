"use client";

import { SourceLink } from "@/components/dashboard/source-link";
import type { IndiaDashboardPayload, QuoteField } from "@/lib/feeds/india/types";
import { fmtChgPct, fmtInr, fmtNum, fmtUsd } from "@/lib/format-india";
import { cn } from "@/lib/utils";

export function GlobalRadar({ data }: { data: IndiaDashboardPayload }) {
  const g = data.globalRadar;
  const impact = data.indiaImpact;
  const impactIcon = impact.label === "positive" ? "↑" : impact.label === "negative" ? "↓" : "→";
  const impactColor =
    impact.label === "positive" ? "text-emerald-400" : impact.label === "negative" ? "text-rose-400" : "text-amber-300";

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">Global macro radar</h2>
      <p className="mt-1 text-xs text-muted-foreground">Variables that transmit into Indian markets (live quotes).</p>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
        <Cell label="S&P 500" q={g.sp500} />
        <Cell label="NASDAQ" q={g.nasdaq} />
        <Cell label="DOW" q={g.dow} />
        <Cell label="US 10Y" q={g.us10y} suffix="%" raw />
        <Cell label="DXY" q={g.dxy} raw />
        <Cell label="VIX" q={g.vix} raw />
        <Cell label="BRENT" q={g.brent} money />
        <Cell label="GOLD" q={g.gold} money />
        <Cell label="COPPER" q={g.copper} money />
        <Cell label="USD/INR" q={g.usdInr} inr />
      </div>
      <div className="mt-4 rounded-md border border-border bg-muted/20 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">India impact</p>
        <p className={cn("mt-1 font-mono text-lg", impactColor)}>
          {impactIcon} {impact.label.charAt(0).toUpperCase() + impact.label.slice(1)}
          <span className="ml-2 text-xs text-muted-foreground">score {impact.score.toFixed(4)}</span>
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">{impact.methodology}</p>
        <ul className="mt-2 space-y-1 font-mono text-[10px] text-muted-foreground">
          {impact.drivers.map((d) => (
            <li key={d.factor}>
              {d.factor}: {d.value} (contrib {d.contribution.toFixed(4)})
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Cell({
  label,
  q,
  suffix = "",
  raw,
  money,
  inr,
}: {
  label: string;
  q: QuoteField;
  suffix?: string;
  raw?: boolean;
  money?: boolean;
  inr?: boolean;
}) {
  const up = (q.changePct ?? 0) >= 0;
  let display = "—";
  if (q.value != null) {
    if (inr) display = fmtInr(q.value);
    else if (money) display = fmtUsd(q.value);
    else display = `${fmtNum(q.value, raw ? 2 : 2)}${suffix}`;
  }
  return (
    <div className="rounded-md border border-border/70 px-2 py-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="font-mono text-sm">{display}</p>
      <p className={cn("font-mono text-[10px]", up ? "text-emerald-400" : "text-rose-400")}>
        {raw && q.changePct == null ? "" : fmtChgPct(q.changePct ?? null)}
      </p>
      <SourceLink source={q.source} />
    </div>
  );
}
