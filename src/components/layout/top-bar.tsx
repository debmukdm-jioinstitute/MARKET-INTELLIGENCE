"use client";

import { usePortfolio } from "@/components/providers/portfolio-provider";
import { LAST_DATE } from "@/lib/calendar";
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
  const spy = getReturn("SPY", 1);
  const tlt = getReturn("TLT", 1);
  const vixProxy = Math.abs(getReturn("SPY", 5)) * 18 + 12;

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
        <Tape label="SPX" value={lastClose("SPY")} chg={spy} />
        <Tape label="UST" value={lastClose("TLT")} chg={tlt} />
        <span className="text-muted-foreground">
          VIX <span className="text-foreground">{vixProxy.toFixed(1)}</span>
        </span>
        <span className="text-muted-foreground">{LAST_DATE} 16:00 ET</span>
      </div>
    </header>
  );
}

function Tape({ label, value, chg }: { label: string; value: number; chg: number }) {
  return (
    <span className="text-muted-foreground">
      {label}{" "}
      <span className="text-foreground">{value.toFixed(2)}</span>{" "}
      <span className={chg >= 0 ? "text-emerald-400" : "text-rose-400"}>{formatPct(chg)}</span>
    </span>
  );
}
