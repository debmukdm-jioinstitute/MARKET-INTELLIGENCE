import { MACRO_SECTIONS } from "@/lib/macro/sections-meta";
import { ALL_NAV_SECTIONS, pathOf } from "@/lib/nav-columns";
import { HUBS } from "@/lib/hubs";

export type PortalPageRegistryEntry = {
  href: string;
  label: string;
  navSection: string;
  navGroup: string;
  sortOrder: number;
  /** When true, `/href` and `/href/*` inherit this row's enabled/locked flags. */
  appliesToChildren: boolean;
};

const DEFAULT_LOCK_MESSAGE = "We're still building this — check back soon.";

export { DEFAULT_LOCK_MESSAGE };

function pushUnique(map: Map<string, PortalPageRegistryEntry>, entry: PortalPageRegistryEntry) {
  if (!map.has(entry.href)) map.set(entry.href, entry);
}

/** Canonical list of controllable portal routes (nav + macro sections + dynamic prefixes). */
export function buildPortalPageRegistry(): PortalPageRegistryEntry[] {
  const map = new Map<string, PortalPageRegistryEntry>();
  let order = 0;

  pushUnique(map, {
    href: "/Home",
    label: "India dashboard",
    navSection: "Today",
    navGroup: "Home",
    sortOrder: order++,
    appliesToChildren: false,
  });

  for (const hub of Object.values(HUBS)) {
    pushUnique(map, { href: hub.route, label: hub.title, navSection: hub.title, navGroup: "Hub", sortOrder: order++, appliesToChildren: false });
  }

  for (const section of ALL_NAV_SECTIONS) {
    for (const group of section.groups) {
      for (const item of group.items) {
        if (item.external) continue;
        pushUnique(map, {
          href: pathOf(item.href),
          label: item.label,
          navSection: section.title,
          navGroup: group.label,
          sortOrder: order++,
          appliesToChildren: false,
        });
      }
    }
  }

  for (const macro of MACRO_SECTIONS) {
    pushUnique(map, {
      href: macro.href,
      label: macro.title,
      navSection: "Economy",
      navGroup: "Macro Board (sections)",
      sortOrder: order++,
      appliesToChildren: false,
    });
  }

  const extras: Omit<PortalPageRegistryEntry, "sortOrder">[] = [
    { href: "/macro/yields", label: "Yield curves", navSection: "Economy", navGroup: "Macro Board", appliesToChildren: false },
    { href: "/macro/stress/backtest", label: "Stress backtest", navSection: "Economy", navGroup: "Stress & Scenarios", appliesToChildren: false },
    { href: "/macro/currency", label: "Currency dashboard", navSection: "Markets", navGroup: "Market Snapshot", appliesToChildren: false },
    { href: "/macro/commodities", label: "Commodities dashboard", navSection: "Markets", navGroup: "Market Snapshot", appliesToChildren: false },
    { href: "/macro/indices", label: "World indices", navSection: "Markets", navGroup: "Market Snapshot", appliesToChildren: false },
    { href: "/markets/india", label: "India equity detail pages", navSection: "Markets", navGroup: "Market Snapshot", appliesToChildren: true },
    { href: "/research", label: "Research symbol pages", navSection: "Companies", navGroup: "Research", appliesToChildren: true },
  ];

  for (const e of extras) {
    pushUnique(map, { ...e, sortOrder: order++ });
  }

  return [...map.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}
