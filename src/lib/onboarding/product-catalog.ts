import { catalogFlags, defaultFlagEnabled, FLAGS } from "@/lib/admin/system";
import { NAV_SECTIONS, type NavLink } from "@/lib/nav-columns";
import { buildPortalPageRegistry } from "@/lib/portal-page-registry";

export type CatalogFeature = {
  section: string;
  group: string;
  label: string;
  href: string;
  description: string;
  badge?: string;
};

export type SubscribedService = {
  name: string;
  description: string;
  status: "Included" | "Beta" | "Optional";
};

/** Bumps when nav/registry/flags change — used to prompt fresh onboarding PDF/HTML. */
export function getOnboardingCatalogVersion(): string {
  const featureCount = listProductFeatures().length;
  const registryCount = buildPortalPageRegistry().length;
  return `mi-${featureCount}-r${registryCount}-f${FLAGS.length}`;
}

/** All portal product pages/features derived from live nav (updates when nav-columns changes). */
export function listProductFeatures(): CatalogFeature[] {
  const out: CatalogFeature[] = [];
  for (const section of NAV_SECTIONS) {
    for (const group of section.groups) {
      for (const item of group.items) {
        if (item.external) continue;
        out.push({
          section: section.title,
          group: group.label,
          label: item.label,
          href: item.href,
          description: item.desc,
          badge: item.badge,
        });
      }
    }
  }
  return out;
}

/** Services included with a standard (free beta) account. */
export function listSubscribedServices(_features: CatalogFeature[]): SubscribedService[] {
  const base: SubscribedService[] = [
    {
      name: "Market Intelligence Terminal",
      description: "Web portal access to dashboards, research, portfolio tools, and data export.",
      status: "Included",
    },
    {
      name: "Virtual portfolio & analytics",
      description: "Holdings tracking, risk metrics, attribution, and optimizer (personal book).",
      status: "Included",
    },
    {
      name: "Market data & macro feeds",
      description: "Connected public and licensed feeds as configured on /data/feeds (freshness varies by source).",
      status: "Included",
    },
    {
      name: "Daily brief & intelligence feed",
      description: "AI-assisted briefings and news scoring where enabled.",
      status: "Beta",
    },
    {
      name: "Alerts & notifications",
      description: "User-defined rules and optional web push when configured.",
      status: "Included",
    },
    {
      name: "Excel / structured data export",
      description: "Download datasets and workbook exports from Data Export.",
      status: "Included",
    },
  ];
  const aiPages = _features.filter((f) => f.badge === "AI").length;
  if (aiPages > 0) {
    base.push({
      name: "AI-assisted modules",
      description: `${aiPages} AI-labelled tools in the current catalog (desk, signals, options flow, etc.).`,
      status: "Beta",
    });
  }
  return base;
}

export function listPlatformCapabilities(enabledFlags: Record<string, boolean>) {
  return catalogFlags().map((f) => ({
    flag: f.flag,
    label: f.label,
    enabled: enabledFlags[f.flag] ?? defaultFlagEnabled(f.flag),
  }));
}

export function flattenNavForExport(): NavLink[] {
  return NAV_SECTIONS.flatMap((s) => s.groups.flatMap((g) => g.items.filter((i) => !i.external)));
}
