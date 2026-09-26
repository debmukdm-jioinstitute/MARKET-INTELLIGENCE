import { formatByFmt, formatMillions } from "@/lib/models/format";
import type { ModelResult } from "@/lib/models/types";
import { cn } from "@/lib/utils";

function Card({ label, value, tone, sub }: { label: string; value: string; tone?: "up" | "down" | "neutral"; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-sm uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-heading text-2xl font-semibold tabular-nums tracking-tight",
          tone === "up" && "text-emerald-600",
          tone === "down" && "text-rose-600",
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-1 text-sm text-muted-foreground">{sub}</p> : null}
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
      <Card label={model.method === "fcff" ? "Implied value (DCF)" : "Implied value (residual income)"} value={formatByFmt(dcf.impliedPrice, "price", ccy)} tone={upsideTone} />
      <Card
        label="Upside / (downside)"
        value={`${dcf.upside >= 0 ? "+" : ""}${(dcf.upside * 100).toFixed(1)}%`}
        tone={upsideTone}
      />
      <Card label={model.method === "fcff" ? "Enterprise value" : "Equity value"} value={formatMillions(dcf.enterpriseValue, ccy)} />
      <Card
        label={model.method === "fcff" ? "WACC" : "Cost of equity"}
        value={formatByFmt(model.method === "fcff" ? wacc.wacc : wacc.costOfEquity, "pct2")}
        sub={`Rf ${formatByFmt(model.assumptions.values.risk_free as number, "pct2")} · ERP ${formatByFmt((model.assumptions.values.erp as number) + (model.assumptions.values.country_risk_premium as number), "pct2")}`}
      />
      <Card
        label="Selected beta"
        value={formatByFmt(beta.selectedBeta, "beta")}
        sub={beta.method === "peer" ? `Bottom-up: ${beta.nPeers} peers` : beta.fallback ? "Regression unusable — defaulted to 1.0" : `${beta.nObs} monthly observations`}
      />
    </div>
  );
}
