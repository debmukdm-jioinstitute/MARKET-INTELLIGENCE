import { hasDatabase, sql } from "../db";
import { getState, setState } from "./store";
import type { NewEvent } from "./types";

/** Newly published briefs and admin announcements. Baseline on first run so old items are not announced. */
export async function detectContent(): Promise<NewEvent[]> {
  if (!hasDatabase()) return [];
  const ev: NewEvent[] = [];

  try {
    const rows = await sql()`SELECT id, kind, payload->>'headline' AS headline FROM daily_briefs ORDER BY id DESC LIMIT 3`;
    const last = await getState<{ id: number }>("content_brief");
    const newest = rows[0] ? Number(rows[0].id) : 0;
    if (last) {
      for (const r of rows) {
        if (Number(r.id) > last.id)
          ev.push({ key: `brief:${r.id}`, category: "brief", severity: "info", title: `${r.kind === "pre" ? "Pre-market" : "Post-close"} brief published`, body: String(r.headline ?? ""), href: "/intelligence/brief" });
      }
    }
    await setState("content_brief", { id: newest });
  } catch {
    /* briefs table may not exist yet */
  }

  try {
    const rows = await sql()`SELECT id, title, body, severity, created_at FROM app_updates WHERE published = true ORDER BY created_at DESC LIMIT 3`;
    const last = await getState<{ at: string }>("content_update");
    if (last) {
      for (const r of rows) {
        if (new Date(r.created_at as string).toISOString() > last.at)
          ev.push({ key: `update:${r.id}`, category: "data", severity: r.severity === "critical" ? "high" : r.severity === "warning" ? "medium" : "info", title: String(r.title), body: String(r.body), href: "/Home" });
      }
    }
    await setState("content_update", { at: rows[0] ? new Date(rows[0].created_at as string).toISOString() : new Date(0).toISOString() });
  } catch {
    /* table may not exist yet */
  }
  return ev;
}
