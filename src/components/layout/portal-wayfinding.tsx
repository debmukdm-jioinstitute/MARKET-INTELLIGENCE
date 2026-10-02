"use client";

import { useNavSections } from "@/components/layout/app-nav";
import { SectionNav } from "@/components/layout/section-nav";
import { buildPortalWayfinding } from "@/lib/nav-wayfinding";
import { findGroup } from "@/lib/nav-columns";
import { usePortalPages } from "@/components/providers/portal-page-provider";
import { cn } from "@/lib/utils";
import { ChevronLeft, Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Back link + Home link + breadcrumb + sibling tabs — every portal page except Home. */
export function PortalWayfinding() {
  const path = usePathname();
  const sections = useNavSections();
  const { hrefAllowed } = usePortalPages();
  const trail = buildPortalWayfinding(path, sections, hrefAllowed);
  const hit = findGroup(sections, path);
  const siblings =
    hit?.group.items.filter((i) => !i.external && hrefAllowed(i.href)).map((i) => ({
      href: i.href,
      label: i.label,
      badge: i.badge,
    })) ?? [];

  if (path === "/Home") return null;

  if (!trail) {
    return (
      <div className="portal-header-enter mb-3 flex items-center gap-2">
        <Link
          href="/Home"
          className={cn(
            "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs",
            "transition touch-manipulation hover:bg-accent active:scale-[0.98]",
          )}
        >
          <ChevronLeft className="size-4 text-muted-foreground" aria-hidden />
          <span>Back to Home</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="portal-header-enter mb-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={trail.back.href}
          className={cn(
            "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs sm:text-sm font-semibold text-foreground shadow-xs",
            "transition touch-manipulation hover:bg-accent active:scale-[0.98]",
          )}
        >
          <ChevronLeft className="size-4 text-muted-foreground" aria-hidden />
          <span>{trail.back.label}</span>
        </Link>

        <Link
          href="/Home"
          className={cn(
            "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-foreground shadow-xs",
            "transition touch-manipulation hover:bg-accent active:scale-[0.98]",
          )}
          title="Go to Home"
        >
          <Home className="size-3.5 sm:size-4 text-primary" aria-hidden />
          <span className="hidden sm:inline">Home</span>
        </Link>

        <nav aria-label="Breadcrumb" className="min-w-0 flex-1 overflow-x-auto no-scrollbar">
          <ol className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
            {trail.crumbs.map((crumb, i) => (
              <li key={crumb.href} className="flex items-center gap-1 shrink-0">
                {i > 0 ? <span aria-hidden className="text-border">›</span> : null}
                <Link href={crumb.href} className="font-medium hover:text-foreground">
                  {crumb.label}
                </Link>
              </li>
            ))}
            <li className="flex items-center gap-1 shrink-0">
              <span aria-hidden className="text-border">›</span>
              <span className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-none" aria-current="page">
                {trail.current}
              </span>
            </li>
          </ol>
        </nav>
      </div>
      {siblings.length >= 2 ? <SectionNav items={siblings} className="mb-0" /> : null}
    </div>
  );
}
