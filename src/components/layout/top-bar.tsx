"use client";

import { useCommandPalette } from "@/components/command-palette/command-palette-provider";
import { AppNavTrigger, MegaNavBar } from "@/components/layout/app-nav";
import { PushNotificationsToggle } from "@/components/layout/push-notifications-toggle";
import { SymbolSearch } from "@/components/research/symbol-search";
import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function TopBar() {
  const pathname = usePathname();
  const { setOpen: setPaletteOpen } = useCommandPalette();

  return (
    <header className="relative z-50 grid h-auto min-h-14 grid-cols-1 items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur lg:grid-cols-[auto_minmax(240px,420px)_1fr] lg:gap-4 lg:px-6 lg:py-2">
      <div className="flex shrink-0 items-center gap-3">
        <AppNavTrigger />
        <Link href="/" className="hidden whitespace-nowrap font-heading text-sm font-semibold tracking-tight transition-colors hover:text-primary sm:inline">
          Market Intelligence
        </Link>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground sm:inline-flex"
        >
          <Search className="size-3" />
          Commands
          <kbd className="ml-1 rounded border border-border px-1 font-mono text-[10px]">⌘K</kbd>
        </button>
        <MegaNavBar />
      </div>
      {pathname !== "/research" ? (
        <SymbolSearch variant="bar" className="w-full min-w-0" />
      ) : (
        <div aria-hidden />
      )}
      <div className="flex flex-wrap items-center justify-end gap-4 font-mono text-[11px] lg:gap-5">
        <PushNotificationsToggle />
      </div>
    </header>
  );
}
