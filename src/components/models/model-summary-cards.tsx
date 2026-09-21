import { formatByFmt, formatMillions } from "@/lib/models/format";
import type { ModelResult } from "@/lib/models/types";
import { cn } from "@/lib/utils";

function Card({ label, value, tone, sub }: { label: string; value: string; tone?: "up" | "down" | "neutral"; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-heading text-2xl font-semibold tabular-nums tracking-tight",
          tone === "up" && "text-emerald-400",
          tone === "down" && "text-rose-400",
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-1 text-[10px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function ModelSummaryCards({ model }: { model: ModelResult }) {
  const { dcf, wacc, beta, dataset } = model;
  const ccy = dataset.profile.currency;
  const upsideTone = dcf.upside >= 0 ? "up" : "down";

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Card label="Current price" value={formatByFmt(dcf.currentPrice, "price", ccy)} />
      <Card label="Implied value (DCF)" value={formatByFmt(dcf.impliedPrice, "price", ccy)} tone={upsideTone} />
      <Card
        label="Upside / (downside)"
        value={`${dcf.upside >= 0 ? "+" : ""}${(dcf.upside * 100).toFixed(1)}%`}
        tone={upsideTone}
      />
      <Card label="Enterprise value" value={formatMillions(dcf.enterpriseValue, ccy)} />
      <Card label="WACC" value={formatByFmt(wacc.wacc, "pct2")} />
      <Card
        label="Selected beta"
        value={formatByFmt(beta.selectedBeta, "beta")}
        sub={beta.fallback ? "Regression unusable — defaulted to 1.0" : `${beta.nObs} monthly observations`}
      />
    </div>
  );
}
