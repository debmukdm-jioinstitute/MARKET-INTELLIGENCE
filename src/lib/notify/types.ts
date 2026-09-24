export type EventCategory = "market" | "macro" | "scanner" | "ai" | "brief" | "data";
export type EventSeverity = "high" | "medium" | "info";

/** A change in the site's data worth telling a visitor about. Events are global (the same for every visitor). */
export interface SiteEvent {
  id: string;
  at: string; // ISO time the change was detected
  category: EventCategory;
  severity: EventSeverity;
  title: string;
  body: string;
  href: string; // page where the visitor can see the underlying data
}

/** What a detector emits. `key` identifies one specific occurrence so the same change is never announced twice. */
export type NewEvent = Omit<SiteEvent, "id" | "at"> & { key: string };
