"use client";

import { usePortfolio } from "@/components/providers/portfolio-provider";
import { quoteMap, useFeedHub } from "@/hooks/use-feed-hub";
import { formatPct } from "@/lib/format";
import { getReturn, lastClose } from "@/lib/market";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TopBar() {
  const { portfolios, active, setActiveId } = usePortfolio();
  const { data } = useFeedHub(60_000);
  const live = quoteMap(data);

  const spyQ = live.get("SPY");
  const tltQ = live.get("TLT");
  const vixQ = live.get("VIX") ?? live.get("^VIX");

  const spyLast = spyQ?.price ?? lastClose("SPY");
  const spyChg = spyQ?.changePct ?? getReturn("SPY", 1);
  const tltLast = tltQ?.price ?? lastClose("TLT");
  const tltChg = tltQ?.changePct ?? getReturn("TLT", 1);
  const vix =
    vixQ?.price ??
    (typeof data?.macro.find((m) => m.id === "fred_vix")?.latest === "number"
      ? data!.macro.find((m) => m.id === "fred_vix")!.latest
      : Math.abs(getReturn("SPY", 5)) * 18 + 12);

  const asOf = spyQ?.asOf ? new Date(spyQ.asOf) : null;

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
      <div className="flex items-center gap-6">
        <Select value={active.id} onValueChange={setActiveId}>
          <SelectTrigger className="h-9 w-[280px] border-border bg-card font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {portfolios.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="hidden text-xs text-muted-foreground lg:block">{active.mandate}</p>
      </div>
      <div className="flex items-center gap-5 font-mono text-[11px]">
        <Tape label="SPX" value={spyLast} chg={spyChg} live={Boolean(spyQ)} />
        <Tape label="UST" value={tltLast} chg={tltChg} live={Boolean(tltQ)} />
        <span className="text-muted-foreground">
          VIX <span className="text-foreground">{vix.toFixed(1)}</span>
        </span>
        <span className="text-muted-foreground">
          {asOf ? asOf.toLocaleString() : "Live tape"}
        </span>
      </div>
    </header>
  );
}

function Tape({
  label,
  value,
  chg,
  live,
}: {
  label: string;
  value: number;
  chg: number;
  live?: boolean;
}) {
  return (
    <span className="text-muted-foreground">
      {label}
      {live ? <span className="text-emerald-400">*</span> : null}{" "}
      <span className="text-foreground">{value.toFixed(2)}</span>{" "}
      <span className={chg >= 0 ? "text-emerald-400" : "text-rose-400"}>{formatPct(chg)}</span>
    </span>
  );
}
