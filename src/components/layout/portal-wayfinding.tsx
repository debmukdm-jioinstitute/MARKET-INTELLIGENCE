"use client";

import { useNavSections } from "@/components/layout/app-nav";
import { SectionNav } from "@/components/layout/section-nav";
import { buildPortalWayfinding } from "@/lib/nav-wayfinding";
import { findGroup } from "@/lib/nav-columns";
import { usePortalPages } from "@/components/providers/portal-page-provider";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Back link + breadcrumb + sibling tabs — every portal page except Home. */
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

  if (!trail) return null;

  return (
    <div className="portal-header-enter mb-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={trail.back.href}
          className={cn(
            "inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-sm",
            "transition touch-manipulation hover:bg-accent active:scale-[0.98]",
          )}
        >
          <ChevronLeft className="size-4 text-muted-foreground" aria-hidden />
          {trail.back.label}
        </Link>
        <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            {trail.crumbs.map((crumb, i) => (
              <li key={crumb.href} className="flex items-center gap-1">
                {i > 0 ? <span aria-hidden className="text-border">›</span> : null}
                <Link href={crumb.href} className="font-medium hover:text-foreground">
                  {crumb.label}
                </Link>
              </li>
            ))}
            <li className="flex items-center gap-1">
              <span aria-hidden className="text-border">›</span>
              <span className="font-semibold text-foreground" aria-current="page">
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
