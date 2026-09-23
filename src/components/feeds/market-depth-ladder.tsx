import type { DepthLevel } from "@/lib/feeds/sources/upstox";
import { cn } from "@/lib/utils";

/** 5-level bid/ask depth ladder — proportional bars, not a chart, so hand-styled bars fit better than Recharts. */
export function MarketDepthLadder({ buy, sell }: { buy: DepthLevel[]; sell: DepthLevel[] }) {
  if (!buy.length && !sell.length) {
    return <p className="text-sm text-muted-foreground">No depth data.</p>;
  }
  const maxQty = Math.max(1, ...buy.map((b) => b.quantity), ...sell.map((s) => s.quantity));
  const rows = Math.max(buy.length, sell.length);

  return (
    <div className="space-y-1 text-sm">
      <div className="grid grid-cols-2 gap-2 text-sm uppercase tracking-wide text-muted-foreground">
        <span>Bid</span>
        <span className="text-right">Ask</span>
      </div>
      {Array.from({ length: rows }).map((_, i) => {
        const b = buy[i];
        const s = sell[i];
        return (
          <div key={i} className="grid grid-cols-2 gap-2">
            <DepthRow level={b} side="buy" pctOfMax={b ? b.quantity / maxQty : 0} />
            <DepthRow level={s} side="sell" pctOfMax={s ? s.quantity / maxQty : 0} />
          </div>
        );
      })}
    </div>
  );
}

function DepthRow({
  level,
  side,
  pctOfMax,
}: {
  level: DepthLevel | undefined;
  side: "buy" | "sell";
  pctOfMax: number;
}) {
  if (!level) return <div />;
  const barColor = side === "buy" ? "bg-emerald-500/20" : "bg-rose-500/20";
  const justify = side === "buy" ? "justify-end" : "justify-start";
  return (
    <div className={cn("relative flex items-center gap-2 overflow-hidden rounded-sm", justify)}>
      <div
        className={cn("absolute inset-y-0", barColor, side === "buy" ? "right-0" : "left-0")}
        style={{ width: `${Math.max(4, pctOfMax * 100)}%` }}
      />
      <span className={cn("relative z-10 px-1 tabular-nums", side === "sell" && "order-2")}>
        {level.price.toFixed(2)}
      </span>
      <span className="relative z-10 px-1 tabular-nums text-muted-foreground">
        {level.quantity.toLocaleString("en-IN")}
      </span>
    </div>
  );
}
