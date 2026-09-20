"use client";

import { useCommandPalette } from "@/components/command-palette/command-palette-provider";
import { usePortfolio } from "@/components/providers/portfolio-provider";
import { SymbolSearch } from "@/components/research/symbol-search";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { quoteMap, useFeedHub } from "@/hooks/use-feed-hub";
import { formatPct } from "@/lib/format";
import { getReturn, lastClose } from "@/lib/market";
import { Search } from "lucide-react";
import { usePathname } from "next/navigation";

export function TopBar() {
  const pathname = usePathname();
  const { portfolios, active, setActiveId } = usePortfolio();
  const { setOpen: setPaletteOpen } = useCommandPalette();
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
    <header className="grid h-auto min-h-14 grid-cols-1 items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur lg:grid-cols-[minmax(200px,280px)_1fr_auto] lg:gap-4 lg:px-6 lg:py-2">
      <div className="flex items-center gap-4">
        <Select value={active.id} onValueChange={setActiveId}>
          <SelectTrigger className="h-9 w-full max-w-[280px] border-border bg-card font-medium">
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
        <p className="hidden text-xs text-muted-foreground xl:block">{active.mandate}</p>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="hidden items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground sm:inline-flex"
        >
          <Search className="size-3" />
          Commands
          <kbd className="ml-1 rounded border border-border px-1 font-mono text-[10px]">⌘K</kbd>
        </button>
      </div>
      <SymbolSearch
        variant="bar"
        className="w-full min-w-0"
        showShortcut={pathname !== "/research"}
      />
      <div className="flex flex-wrap items-center justify-end gap-4 font-mono text-[11px] lg:gap-5">
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
