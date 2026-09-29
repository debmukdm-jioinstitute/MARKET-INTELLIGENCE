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
    <header className="relative z-50 border-b border-border bg-background/80 px-3 py-2 sm:px-4 sm:py-2.5 lg:px-6 lg:py-2 backdrop-blur">
      <div className="flex flex-col gap-2 lg:grid lg:grid-cols-[auto_minmax(180px,420px)_1fr] lg:items-center lg:gap-4">
        {/* Top row on mobile / Left group on desktop */}
        <div className="flex items-center justify-between gap-3 lg:justify-start">
          <div className="flex items-center gap-2 sm:gap-3">
            <AppNavTrigger />
            <Link href="/Home" className="flex items-center">
              <img src="/logo.png" alt="Market Intelligence" className="h-6 sm:h-7 w-auto dark:invert" />
            </Link>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground md:inline-flex"
            >
              <Search className="size-3" />
              Commands
              <kbd className="ml-1 rounded border border-border px-1 text-xs">⌘K</kbd>
            </button>
            <MegaNavBar />
          </div>

          {/* On mobile (< lg), notification bell & command search icon sit cleanly on the right */}
          <div className="flex items-center gap-1.5 lg:hidden">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search and commands"
              className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground touch-manipulation"
            >
              <Search className="size-4" />
            </button>
            <NotificationBell />
          </div>
        </div>

        {/* Search bar row */}
        {pathname !== "/research" ? (
          <div id="tour-search" className="min-w-0 flex-1">
            <SymbolSearch variant="bar" className="w-full min-w-0" />
          </div>
        ) : (
          <div aria-hidden className="hidden lg:block" />
        )}

        {/* Desktop notification bell */}
        <div className="hidden lg:flex items-center justify-end gap-4 text-sm lg:gap-5">
          <div id="tour-alerts">
            <NotificationBell />
          </div>
        </div>
      </div>
    </header>
  );
}
