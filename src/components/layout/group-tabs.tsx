"use client";

import { useNavSections } from "@/components/layout/app-nav";
import { SectionNav } from "@/components/layout/section-nav";
import { findGroup } from "@/lib/nav-columns";
import { isHubRoute } from "@/lib/hubs";
import { usePathname } from "next/navigation";

/** Shows the sibling pages of the current task (e.g. Stock Scanner · AI Signals · Alerts) as tabs, so every page links to its neighbours without a long menu. */
export function GroupTabs() {
  const path = usePathname();
  const sections = useNavSections({ includeUtility: true });
  const hit = findGroup(sections, path);
  // Hub pages (and the pages embedded in them) use the sticky jump chips instead of sibling tabs.
  if (isHubRoute(path) || !hit || hit.group.items.length < 2) return null;
  return (
    <div className="portal-header-enter mb-1">
      <p className="mb-1 text-sm text-muted-foreground">
        {hit.section.title} <span aria-hidden>›</span> {hit.group.label}
      </p>
      <SectionNav items={hit.group.items.filter((i) => !i.external).map((i) => ({ href: i.href, label: i.label, badge: i.badge }))} />
    </div>
  );
}
