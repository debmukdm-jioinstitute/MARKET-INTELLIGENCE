"use client";

import { useCommandPalette } from "@/components/command-palette/command-palette-provider";
import { AppNavTrigger, MegaNavBar } from "@/components/layout/app-nav";
import { NotificationBell } from "@/components/layout/notification-bell";
import { SymbolSearch } from "@/components/research/symbol-search";
import { ChevronLeft, Home, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { setOpen: setPaletteOpen } = useCommandPalette();
  const isHome = pathname === "/Home";

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/Home");
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 px-3 py-2 sm:px-4 sm:py-2.5 lg:px-6 lg:py-2 backdrop-blur-md transition-shadow shadow-xs">
      <div className="flex flex-col gap-2 lg:grid lg:grid-cols-[auto_minmax(180px,420px)_1fr] lg:items-center lg:gap-4">
        {/* Top row on mobile / Left group on desktop */}
        <div className="flex items-center justify-between gap-2 lg:justify-start">
          {/* Mobile (< lg) Left Navigation Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 lg:hidden">
            {!isHome ? (
              <>
                <button
                  type="button"
                  onClick={handleBack}
                  aria-label="Go back"
                  className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-border/80 bg-card px-2.5 py-1 text-xs font-semibold text-foreground transition-all hover:bg-accent active:scale-95 shadow-xs touch-manipulation"
                >
                  <ChevronLeft className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span>Back</span>
                </button>
                <Link
                  href="/Home"
                  aria-label="Go to Home"
                  className="inline-flex size-9 items-center justify-center rounded-xl border border-border/80 bg-card text-foreground transition-all hover:bg-accent active:scale-95 shadow-xs touch-manipulation"
                  title="Go to Home"
                >
                  <Home className="size-4 text-primary" aria-hidden />
                </Link>
              </>
            ) : (
              <AppNavTrigger />
            )}

            <Link href="/Home" className="flex items-center pl-0.5">
              <img src="/logo.png" alt="Market Intelligence" loading="eager" decoding="async" className="h-6 sm:h-7 w-auto dark:invert" />
            </Link>
          </div>

          {/* Desktop (>= lg) Left Navigation Controls */}
          <div className="hidden lg:flex items-center gap-3">
            <AppNavTrigger />
            <Link href="/Home" className="flex items-center">
              <img src="/logo.png" alt="Market Intelligence" loading="eager" decoding="async" className="h-7 w-auto dark:invert" />
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

          {/* On mobile (< lg), search, notifications & menu sit cleanly on the right */}
          <div className="flex items-center gap-1 sm:gap-1.5 lg:hidden">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search and commands"
              className="flex size-9 items-center justify-center rounded-xl border border-border/70 bg-card text-muted-foreground hover:bg-accent hover:text-foreground touch-manipulation shadow-xs"
            >
              <Search className="size-4" />
            </button>
            <NotificationBell />
            {!isHome ? <AppNavTrigger /> : null}
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
