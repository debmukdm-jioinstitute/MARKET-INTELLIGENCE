"use client";

import Link from "next/link";
import { Menu, X, Home, LayoutDashboard } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";

const EXPLORE_LINKS = [
  { label: "Markets", href: "/markets/india" },
  { label: "Macro", href: "/macro" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Research", href: "/research" },
  { label: "Intelligence", href: "/intelligence" },
];

export function MobileNav({ tone = "light" }: { tone?: "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  const menuBtnClass =
    tone === "dark"
      ? "-mr-1.5 inline-flex size-9 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10"
      : "-mr-1.5 inline-flex size-9 items-center justify-center rounded-lg text-gray-700 transition hover:bg-muted";

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className={menuBtnClass}
      >
        <Menu className="size-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="animate-dropdown-item absolute inset-x-0 top-0 max-h-[85vh] overflow-y-auto rounded-b-2xl border-b border-border bg-white shadow-[var(--shadow-lg)]">
            <div className="flex h-[52px] items-center justify-between border-b border-border px-5">
              <BrandLogo size="sm" href="/" priority />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="-mr-1.5 inline-flex size-9 items-center justify-center rounded-lg text-gray-700 transition hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-1 px-3 py-4 text-[15px] font-medium text-gray-900">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 font-semibold text-primary transition hover:bg-muted"
              >
                <Home className="size-4" />
                <span>Home</span>
              </Link>
              <Link
                href="/Home"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2.5 font-semibold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300"
              >
                <LayoutDashboard className="size-4" />
                <span>Open Terminal</span>
              </Link>
              <a href="#integrations" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 transition hover:bg-muted">
                Integrations (Claude &amp; Telegram)
              </a>
              <a href="#product" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 transition hover:bg-muted">
                Product
              </a>
              <a href="#coverage" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 transition hover:bg-muted">
                Data coverage
              </a>
              <Link href="/help" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 transition hover:bg-muted">
                Help &amp; MCP
              </Link>
              <Link href="/methodology" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 transition hover:bg-muted">
                Methodology
              </Link>
              <Link href="/pricing" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 transition hover:bg-muted">
                Pricing
              </Link>
            </nav>

            <div className="border-t border-border px-3 py-4">
              <p className="px-3 pb-2 text-sm font-bold tracking-wider text-blue-600 uppercase">Explore the terminal</p>
              <div className="flex flex-col gap-1">
                {EXPLORE_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-gray-900 transition hover:bg-muted"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-border px-5 py-4">
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="rounded-full bg-blue-600 px-4 py-2.5 text-center text-[14px] font-medium text-white shadow-[var(--shadow-sm)] transition hover:bg-blue-600/90"
              >
                Start free
              </Link>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-full border border-border px-4 py-2.5 text-center text-[14px] font-medium text-gray-900 transition hover:bg-muted"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
