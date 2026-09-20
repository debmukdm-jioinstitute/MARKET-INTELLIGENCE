"use client";

import { useCommandPalette } from "@/components/command-palette/command-palette-provider";
import { quoteMap, useFeedHub } from "@/hooks/use-feed-hub";
import { formatPct } from "@/lib/format";
import { getReturn, lastClose } from "@/lib/market";
import { Search } from "lucide-react";

export function TopBar() {
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
    <header className="flex h-14 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
      <div className="flex items-center gap-6">
        <p className="font-heading text-sm font-semibold tracking-tight">MI TERMINAL</p>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Search className="size-3" />
          Search
          <kbd className="ml-1 rounded border border-border px-1 font-mono text-[10px]">Space</kbd>
        </button>
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
