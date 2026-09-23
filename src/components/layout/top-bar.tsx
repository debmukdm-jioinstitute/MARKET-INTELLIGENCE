"use client";

import { useCommandPalette } from "@/components/command-palette/command-palette-provider";
import { AppNavTrigger } from "@/components/layout/app-nav";
import { PushNotificationsToggle } from "@/components/layout/push-notifications-toggle";
import { SymbolSearch } from "@/components/research/symbol-search";
import { quoteMap, useFeedHub } from "@/hooks/use-feed-hub";
import { formatPct } from "@/lib/format";
import { getReturn, lastClose } from "@/lib/market";
import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function TopBar() {
  const pathname = usePathname();
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
    <header className="relative z-50 grid h-auto min-h-14 grid-cols-1 items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur lg:grid-cols-[minmax(200px,280px)_minmax(220px,1fr)_auto] lg:gap-4 lg:px-6 lg:py-2">
      <div className="flex items-center gap-3">
        <AppNavTrigger />
        <p className="hidden font-heading text-sm font-semibold tracking-tight sm:inline">Market Intelligence</p>
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
      {pathname !== "/research" ? (
        <SymbolSearch variant="bar" className="w-full min-w-0" />
      ) : (
        <div aria-hidden />
      )}
      <div className="flex flex-wrap items-center justify-end gap-4 font-mono text-[11px] lg:gap-5">
        <Tape label="SPX" value={spyLast} chg={spyChg} live={Boolean(spyQ)} href="/markets/global" />
        <Tape label="UST" value={tltLast} chg={tltChg} live={Boolean(tltQ)} href="/macro/global" />
        <span className="text-muted-foreground">
          VIX <span className="text-foreground">{vix.toFixed(1)}</span>
        </span>
        <span className="text-muted-foreground">
          {asOf ? asOf.toLocaleString() : "Live tape"}
        </span>
        <PushNotificationsToggle />
      </div>
    </header>
  );
}

function Tape({
  label,
  value,
  chg,
  live,
  href,
}: {
  label: string;
  value: number;
  chg: number;
  live?: boolean;
  href?: string;
}) {
  const content = (
    <>
      {label}
      {live ? <span className="text-emerald-600">*</span> : null}{" "}
      <span className="text-foreground">{value.toFixed(2)}</span>{" "}
      <span className={chg >= 0 ? "text-emerald-600" : "text-rose-600"}>{formatPct(chg)}</span>
    </>
  );
  
  if (href) {
    return (
      <Link href={href} className="text-muted-foreground hover:bg-accent/50 px-2 py-0.5 rounded transition-colors block">
        {content}
      </Link>
    );
  }

  return <span className="text-muted-foreground">{content}</span>;
}
