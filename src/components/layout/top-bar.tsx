"use client";

import { useCommandPalette } from "@/components/command-palette/command-palette-provider";
import { AppNavTrigger, MegaNavBar } from "@/components/layout/app-nav";
import { NotificationBell } from "@/components/layout/notification-bell";
import { SymbolSearch } from "@/components/research/symbol-search";
import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function TopBar() {
  const pathname = usePathname();
  const { setOpen: setPaletteOpen } = useCommandPalette();

  return (
    <header className="relative z-50 grid h-auto min-h-14 grid-cols-1 items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur lg:grid-cols-[auto_minmax(180px,420px)_1fr] lg:gap-4 lg:px-6 lg:py-2">
      <div className="flex shrink-0 items-center gap-3">
        <AppNavTrigger />
        <Link href="/Home" className="hidden items-center sm:flex">
          <img src="/logo.png" alt="Market Intelligence" className="h-7 w-auto dark:invert" />
        </Link>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground sm:inline-flex"
        >
          <Search className="size-3" />
          Commands
          <kbd className="ml-1 rounded border border-border px-1 text-sm">⌘K</kbd>
        </button>
        <MegaNavBar />
      </div>
      {pathname !== "/research" ? (
        <div id="tour-search" className="min-w-0">
          <SymbolSearch variant="bar" className="w-full min-w-0" />
        </div>
      ) : (
        <div aria-hidden />
      )}
      <div className="flex flex-wrap items-center justify-end gap-4 text-sm lg:gap-5">
        <div id="tour-alerts">
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
