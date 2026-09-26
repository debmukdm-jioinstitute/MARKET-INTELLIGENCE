/** Live CMS slot keys: `{pathname}::{field}` e.g. `/macro::page-header.title` */

export type SiteContentField = "title" | "subtitle" | "kicker" | "body";

export function siteContentSlot(pathname: string, part: string): string {
  const path = pathname.split("?")[0]!.split("#")[0]! || "/Home";
  return `${path}::${part}`;
}

export function parseSiteContentSlot(slotKey: string): { pathname: string; part: string } | null {
  const idx = slotKey.indexOf("::");
  if (idx <= 0) return null;
  return { pathname: slotKey.slice(0, idx), part: slotKey.slice(idx + 2) };
}

export const MI_EDIT_QUERY = "mi_edit";
export const MI_CONTENT_SAVED = "MI_CONTENT_SAVED";
export const MI_SELECT_SLOT = "MI_SELECT_SLOT";
export const MI_SLOTS = "MI_SLOTS";
export const MI_REQUEST_SLOTS = "MI_REQUEST_SLOTS";

export type MiSlotSummary = {
  slotKey: string;
  field: string;
  label: string;
  text: string;
};

export type MiSelectSlotMessage = {
  type: typeof MI_SELECT_SLOT;
  slotKey: string;
  field: string;
  label: string;
  value: string;
};

export type MiSlotsMessage = {
  type: typeof MI_SLOTS;
  slots: MiSlotSummary[];
};

export type MiIframeMessage = MiSelectSlotMessage | MiSlotsMessage | { type: "MI_EDIT_READY"; pathname: string };

export type MiParentMessage =
  | { type: typeof MI_CONTENT_SAVED }
  | { type: typeof MI_REQUEST_SLOTS }
  | { type: "MI_EDIT_NAVIGATE"; href: string };

export function portalPreviewOrigin(): string {
  if (typeof window !== "undefined") {
    const host = window.location.host;
    if (host.startsWith("admin.")) {
      return `${window.location.protocol}//${host.replace(/^admin\./, "")}`;
    }
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://getmarketintelligence.in";
}

/** Absolute URL for a portal route (live site, not admin). */
export function portalPageUrl(pathname: string, origin = portalPreviewOrigin()): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${origin.replace(/\/$/, "")}${path}`;
}
