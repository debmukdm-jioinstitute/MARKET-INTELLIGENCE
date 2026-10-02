"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, Home, Menu, X, ArrowRight, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

interface PublicHeaderProps {
  backHref?: string;
  backLabel?: string;
}

export function PublicHeader({ backHref, backLabel = "Back" }: PublicHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-xl transition-all shadow-xs">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Left: Mobile Back & Home buttons */}
        <div className="flex items-center gap-2">
          {pathname !== "/" ? (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Go back"
              className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-border/80 bg-card px-2.5 py-1 text-xs font-semibold text-foreground transition-all hover:bg-accent active:scale-95 shadow-xs touch-manipulation"
            >
              <ChevronLeft className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span>{backLabel}</span>
            </button>
          ) : null}

          <Link
            href="/"
            aria-label="Home"
            className="inline-flex size-9 items-center justify-center rounded-xl border border-border/80 bg-card text-foreground transition-all hover:bg-accent active:scale-95 shadow-xs touch-manipulation"
            title="Go to Home"
          >
            <Home className="size-4 text-primary" aria-hidden />
          </Link>

          <Link href="/" className="flex items-center gap-2 pl-1">
            <img src="/logo.png" alt="Market Intelligence" loading="eager" decoding="async" className="h-7 w-auto dark:invert" />
          </Link>
        </div>

        {/* Center / Desktop Links */}
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          <Link href="/Home" className="flex items-center gap-1 font-semibold text-primary transition hover:text-primary/80">
            <LayoutDashboard className="size-3.5" />
            <span>Terminal</span>
          </Link>
          <Link href="/markets/india" className="transition hover:text-foreground">
            Markets
          </Link>
          <Link href="/pricing" className={cn("transition hover:text-foreground", pathname === "/pricing" && "font-semibold text-foreground")}>
            Pricing
          </Link>
          <Link href="/help" className={cn("transition hover:text-foreground", pathname === "/help" && "font-semibold text-foreground")}>
            Help
          </Link>
          <Link href="/methodology" className={cn("transition hover:text-foreground", pathname === "/methodology" && "font-semibold text-foreground")}>
            Methodology
          </Link>
        </nav>

        {/* Right CTA */}
        <div className="flex items-center gap-2">
          <Link
            href="/Home"
            className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-blue-600/90 active:scale-95 touch-manipulation"
          >
            <span>Open Terminal</span>
            <ArrowRight className="size-3" />
          </Link>

          {/* Mobile Menu Trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-border text-foreground transition hover:bg-accent active:scale-95 md:hidden touch-manipulation"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-down Drawer */}
      {mobileMenuOpen ? (
        <div className="border-t border-border bg-card/95 px-4 py-4 backdrop-blur-xl md:hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-1">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold text-foreground hover:bg-accent"
            >
              <Home className="size-4 text-primary" />
              <span>Landing Page</span>
            </Link>
            <Link
              href="/Home"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-11 items-center gap-2.5 rounded-xl bg-primary/10 px-3 text-sm font-bold text-primary hover:bg-primary/15"
            >
              <LayoutDashboard className="size-4" />
              <span>Terminal Dashboard (/Home)</span>
            </Link>
            <Link
              href="/markets/india"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-11 items-center px-3 text-sm font-medium text-foreground hover:bg-accent"
            >
              Live Markets
            </Link>
            <Link
              href="/macro"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-11 items-center px-3 text-sm font-medium text-foreground hover:bg-accent"
            >
              Macro &amp; RBI
            </Link>
            <Link
              href="/portfolio"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-11 items-center px-3 text-sm font-medium text-foreground hover:bg-accent"
            >
              Portfolio &amp; Risk
            </Link>
            <Link
              href="/intelligence/scanner"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-11 items-center px-3 text-sm font-medium text-foreground hover:bg-accent"
            >
              Stock Scanner
            </Link>
            <Link
              href="/help"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-11 items-center px-3 text-sm font-medium text-foreground hover:bg-accent"
            >
              Help &amp; MCP Guides
            </Link>
            <Link
              href="/pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-11 items-center px-3 text-sm font-medium text-foreground hover:bg-accent"
            >
              Pricing &amp; Pro
            </Link>
            <Link
              href="/methodology"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-11 items-center px-3 text-sm font-medium text-foreground hover:bg-accent"
            >
              Data Methodology
            </Link>
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-10 items-center justify-center rounded-xl border border-border text-center text-sm font-semibold text-foreground hover:bg-accent"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-10 items-center justify-center rounded-xl bg-blue-600 text-center text-sm font-semibold text-white shadow-xs hover:bg-blue-600/90"
            >
              Start Free
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
