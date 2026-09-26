import type { PortalPageRegistryEntry } from "@/lib/portal-page-registry";
import { DEFAULT_LOCK_MESSAGE } from "@/lib/portal-page-registry";

export type PortalPageControlRow = {
  href: string;
  label: string;
  nav_section: string;
  nav_group: string;
  sort_order: number;
  enabled: boolean;
  locked: boolean;
  lock_message: string | null;
  applies_to_children: boolean;
  updated_at?: string;
};

export type PortalPathAccess = {
  href: string | null;
  enabled: boolean;
  locked: boolean;
  lockMessage: string;
  hidden: boolean;
};

function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/Home";
  const base = pathname.split("?")[0]!.split("#")[0]!;
  if (base.length > 1 && base.endsWith("/")) return base.slice(0, -1);
  return base;
}

function matchesRow(path: string, row: Pick<PortalPageControlRow, "href" | "applies_to_children">): boolean {
  if (path === row.href) return true;
  if (!row.applies_to_children) return false;
  const prefix = row.href.endsWith("/") ? row.href : `${row.href}/`;
  return path.startsWith(prefix);
}

/** Longest matching registry row wins (exact or prefix). */
export function resolvePortalPathAccess(
  pathname: string,
  controls: PortalPageControlRow[],
): PortalPathAccess {
  const path = normalizePath(pathname);
  let best: PortalPageControlRow | null = null;
  for (const row of controls) {
    if (!matchesRow(path, row)) continue;
    if (!best || row.href.length > best.href.length) best = row;
  }

  if (!best) {
    return { href: null, enabled: true, locked: false, lockMessage: DEFAULT_LOCK_MESSAGE, hidden: false };
  }

  const enabled = best.enabled;
  const locked = enabled && best.locked;
  return {
    href: best.href,
    enabled,
    locked,
    lockMessage: best.lock_message?.trim() || DEFAULT_LOCK_MESSAGE,
    hidden: !enabled,
  };
}

export function isPortalHrefAllowed(href: string, controls: PortalPageControlRow[], bypass: boolean): boolean {
  if (bypass) return true;
  if (href.startsWith("http")) return true;
  return resolvePortalPathAccess(href, controls).enabled;
}

export async function syncPortalPageRegistry(
  db: {
    (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
  },
  registry: PortalPageRegistryEntry[],
): Promise<void> {
  for (const entry of registry) {
    await db`
      INSERT INTO portal_page_controls (
        href, label, nav_section, nav_group, sort_order, applies_to_children, enabled, locked
      ) VALUES (
        ${entry.href},
        ${entry.label},
        ${entry.navSection},
        ${entry.navGroup},
        ${entry.sortOrder},
        ${entry.appliesToChildren},
        true,
        false
      )
      ON CONFLICT (href) DO UPDATE SET
        label = EXCLUDED.label,
        nav_section = EXCLUDED.nav_section,
        nav_group = EXCLUDED.nav_group,
        sort_order = EXCLUDED.sort_order,
        applies_to_children = EXCLUDED.applies_to_children
    `;
  }
}
