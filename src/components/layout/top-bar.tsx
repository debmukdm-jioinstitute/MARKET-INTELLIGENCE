"use client";

import { useCommandPalette } from "@/components/command-palette/command-palette-provider";
import { usePlatformShortcut } from "@/hooks/use-platform-shortcut";
import { AppNavTrigger, MegaNavBar } from "@/components/layout/app-nav";
import { NotificationBell } from "@/components/layout/notification-bell";
import { SymbolSearch } from "@/components/research/symbol-search";
import { ChevronLeft, Home, Search } from "lucide-react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { setOpen: setPaletteOpen } = useCommandPalette();
  const shortcut = usePlatformShortcut();
  const isHome = pathname === "/Home";
  const hasSearchRow = pathname !== "/research";
  // < lg: the search bar row is collapsed until the magnifier is tapped.
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close after navigating (a result was picked).
    setMobileSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileSearchOpen) return;
    // Focus after the row is revealed so the keyboard opens and the dropdown is ready.
    const id = window.requestAnimationFrame(() => {
      searchRowRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [mobileSearchOpen]);

  const onMobileSearchClick = () => {
    if (!hasSearchRow) {
      setPaletteOpen(true);
      return;
    }
    setMobileSearchOpen((v) => !v);
  };

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
                  className="inline-flex size-9 items-center justify-center rounded-xl border border-border/80 bg-card p-1.5 -m-1.5 text-foreground transition-all hover:bg-accent active:scale-95 shadow-xs touch-manipulation"
                  title="Go to Home"
                >
                  <Home className="size-4 text-primary" aria-hidden />
                </Link>
              </>
            ) : (
              <AppNavTrigger />
            )}

            <BrandLogo variant="mark" size="xs" href="/Home" priority className="pl-0.5 sm:hidden" />
            <BrandLogo size="sm" href="/Home" priority className="hidden pl-0.5 sm:inline-flex" />
          </div>

          {/* Desktop (>= lg) Left Navigation Controls */}
          <div className="hidden lg:flex items-center gap-3">
            <AppNavTrigger />
            <BrandLogo size="sm" href="/Home" priority />
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label={`Search and commands (${shortcut.mounted ? shortcut.label : "keyboard shortcut"})`}
              title={`Search symbols, pages & commands (${shortcut.mounted ? shortcut.label : "⌘K / Ctrl K"} or /)`}
              className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border/80 bg-card/60 px-3 py-1 text-sm text-muted-foreground shadow-2xs transition-all hover:border-primary/40 hover:bg-accent hover:text-foreground active:scale-95 touch-manipulation md:inline-flex"
            >
              <Search className="size-3.5 text-muted-foreground" aria-hidden />
              <span>Commands</span>
              {shortcut.mounted && (
                <kbd className="ml-1 rounded border border-border/80 bg-muted/60 px-1.5 py-0.5 text-xs font-semibold text-muted-foreground shadow-2xs transition-opacity duration-200">
                  {shortcut.label}
                </kbd>
              )}
            </button>
            <MegaNavBar />
          </div>

          {/* On mobile (< lg), search, notifications & menu sit cleanly on the right */}
          <div className="flex items-center gap-1 sm:gap-1.5 lg:hidden">
            <button
              type="button"
              onClick={onMobileSearchClick}
              aria-expanded={hasSearchRow ? mobileSearchOpen : undefined}
              aria-label="Search stocks, pages and help"
              title="Search stocks, pages & help"
              className="flex size-9 items-center justify-center rounded-xl border border-border/80 bg-card p-1.5 -m-1.5 text-muted-foreground hover:bg-accent hover:text-foreground active:scale-95 touch-manipulation shadow-xs"
            >
              <Search className="size-4" aria-hidden />
            </button>
            <NotificationBell />
            {!isHome ? <AppNavTrigger /> : null}
          </div>
        </div>

        {/* Search bar row */}
        {hasSearchRow ? (
          <div
            id="tour-search"
            ref={searchRowRef}
            className={mobileSearchOpen ? "min-w-0 flex-1" : "hidden min-w-0 flex-1 lg:block"}
          >
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
