import { MACRO_SECTIONS } from "@/lib/macro/sections-meta";
import { NAV_SECTIONS } from "@/lib/nav-columns";

export type PortalPageRegistryEntry = {
  href: string;
  label: string;
  navSection: string;
  navGroup: string;
  sortOrder: number;
  /** When true, `/href` and `/href/*` inherit this row's enabled/locked flags. */
  appliesToChildren: boolean;
};

const DEFAULT_LOCK_MESSAGE =
  "Our team is building this section. It will be back on the live site soon — thanks for your patience.";

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

  for (const section of NAV_SECTIONS) {
    for (const group of section.groups) {
      for (const item of group.items) {
        if (item.external) continue;
        pushUnique(map, {
          href: item.href,
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
      navSection: "Invest",
      navGroup: "Economy & Macro (sections)",
      sortOrder: order++,
      appliesToChildren: false,
    });
  }

  const extras: Omit<PortalPageRegistryEntry, "sortOrder">[] = [
    { href: "/macro/yields", label: "Yield curves", navSection: "Invest", navGroup: "Economy & Macro", appliesToChildren: false },
    { href: "/macro/stress/backtest", label: "Stress backtest", navSection: "Invest", navGroup: "Economy & Macro", appliesToChildren: false },
    { href: "/macro/currency", label: "Currency dashboard", navSection: "Today", navGroup: "Market Snapshot", appliesToChildren: false },
    { href: "/macro/commodities", label: "Commodities dashboard", navSection: "Today", navGroup: "Market Snapshot", appliesToChildren: false },
    { href: "/macro/indices", label: "World indices", navSection: "Today", navGroup: "Market Snapshot", appliesToChildren: false },
    { href: "/markets/india", label: "India equity detail pages", navSection: "Today", navGroup: "India Cockpit", appliesToChildren: true },
    { href: "/research", label: "Research symbol pages", navSection: "Invest", navGroup: "Research Companies", appliesToChildren: true },
    { href: "/research/model", label: "DCF model pages", navSection: "Invest", navGroup: "Research Companies", appliesToChildren: true },
  ];

  for (const e of extras) {
    pushUnique(map, { ...e, sortOrder: order++ });
  }

  return [...map.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}
