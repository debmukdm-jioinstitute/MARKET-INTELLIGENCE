"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS: [string, string][] = [
  ["/alpha-league", "The league"],
  ["/alpha-league/board", "Leaderboard"],
  ["/alpha-league/portfolio", "My portfolio"],
  ["/alpha-league/backtest", "Research sandbox"],
];

/** Partner lockup: Jio Institute x Market Intelligence on a white chip so both marks stay legible in dark mode. */
export function CoBrand({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-4 rounded-2xl border border-border bg-white px-4 py-2.5 shadow-xs",
        className,
      )}
    >
      <Image
        src="/alpha-league/jio-institute-logo.png"
        alt="Jio Institute"
        width={546}
        height={136}
        priority
        className="h-7 w-auto sm:h-9"
      />
      <span aria-hidden className="h-6 w-px bg-neutral-300" />
      <Image
        src="/alpha-league/market-intelligence-logo.png"
        alt="Market Intelligence"
        width={900}
        height={165}
        priority
        className="h-5 w-auto sm:h-7"
      />
    </div>
  );
}

/** Thin red pulse line, echoing the Jio Institute visual language. */
export function PulseLine({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 600 60"
      fill="none"
      preserveAspectRatio="none"
      className={cn("h-10 w-full text-[var(--alpha-red)]", className)}
    >
      <path
        d="M0 38 H150 L170 38 L182 8 L198 52 L212 24 L224 38 H330 V14 H350 V46 H370 V14 H390 V38 H430 L444 30 L458 38 H600"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function AlphaNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Alpha League"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 text-sm font-semibold sm:mx-0 sm:px-0"
    >
      {TABS.map(([url, label]) => {
        const active =
          url === "/alpha-league" ? pathname === url : pathname.startsWith(url);
        return (
          <Link
            key={url}
            href={url}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-full border px-4 py-2 transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-primary hover:text-primary",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
