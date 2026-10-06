"use client";

import { Panel } from "@/components/layout/page-header";
import type { AgencyCell, RatingEvent } from "@/lib/research/ratings";
import { cn } from "@/lib/utils";
import useSWR from "swr";

export type RatingsResponse = { symbol: string; dbConfigured: boolean; agencies: AgencyCell[]; events: RatingEvent[]; alert: boolean };

/** Module-level fetcher — never inline an async fn in useSWR (React #185). */
export async function loadRatings(url: string): Promise<RatingsResponse> {
  const res = await fetch(url);
  const json = (await res.json()) as RatingsResponse & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}
export const ratingsKey = (symbol: string) => `/api/research/ratings?symbol=${encodeURIComponent(symbol)}`;

const fmtDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const NOTCH_TONE: Record<string, string> = {
  AAA: "bg-emerald-100 text-emerald-800",
  AA: "bg-emerald-50 text-emerald-700",
  A: "bg-sky-50 text-sky-800",
  BBB: "bg-amber-50 text-amber-800",
  BB: "bg-orange-100 text-orange-800",
  B: "bg-rose-100 text-rose-800",
  D: "bg-rose-600 text-white",
};
const ACTION_LABEL: Record<string, string> = { upgrade: "Upgraded", downgrade: "Downgraded", reaffirmation: "Reaffirmed", initial: "Rating assigned", update: "Updated", watch: "Credit watch", withdrawn: "Withdrawn", "not-cooperating": "Issuer not cooperating", rationale: "Rationale published", current: "Seen on RetailBonds" };

const LEGEND: [string, string][] = [
  ["AAA", "safest"],
  ["AA", "very safe"],
  ["A", "safe"],
  ["BBB", "okay — lowest investment grade"],
  ["BB", "risky"],
  ["B", "very risky"],
  ["D", "in default"],
];

/** Small red pulse for the company header when a downgrade / negative outlook / negative watch happened in the last 90 days. */
export function RatingAlertPulse({ symbol }: { symbol: string }) {
  const { data } = useSWR<RatingsResponse>(ratingsKey(symbol), loadRatings, { revalidateOnFocus: false });
  if (!data?.alert) return null;
  return (
    <a href="#ratings" className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700" title="A rating agency downgraded or turned negative on this company in the last 90 days">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-500 opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-rose-600" />
      </span>
      Rating alert · 90 days
    </a>
  );
}

export function RatingsPanel({ symbol }: { symbol: string }) {
  const { data, error, isLoading } = useSWR<RatingsResponse>(ratingsKey(symbol), loadRatings, { revalidateOnFocus: false });
  const anyCovered = data?.agencies.some((a) => a.covered) ?? false;

  return (
    <Panel
      id="credit-ratings"
      title="Credit ratings radar"
      subtitle="What the big rating agencies say about this company's ability to repay debt."
      trust={{ source: "RetailBonds.in aggregation of CRISIL / CARE / ICRA ratings; CARE rationale list; NSE filings", note: "Ratings are the agencies' own opinions — not investment advice" }}
    >
      {isLoading ? <p className="animate-pulse text-sm text-muted-foreground">Loading ratings for {symbol}…</p> : null}
      {error ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Could not load ratings right now. Try again in a moment.</p> : null}

      {data && !error ? (
        <div className="space-y-4">
          {!anyCovered && data.events.length === 0 ? <p className="text-sm text-muted-foreground">No agency ratings collected for {symbol} yet — many companies have no rated listed debt.</p> : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 font-medium">Agency</th>
                  <th className="py-2 pr-3 font-medium">Rating</th>
                  <th className="py-2 pr-3 font-medium">Outlook</th>
                  <th className="py-2 pr-3 font-medium">Last action</th>
                  <th className="py-2 font-medium">Rationale</th>
                </tr>
              </thead>
              <tbody>
                {data.agencies.map((a) => (
                  <tr key={a.agency} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3 font-medium text-foreground">{a.agency}</td>
                    {a.covered ? (
                      <>
                        <td className="py-2 pr-3">{a.rating ? <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", NOTCH_TONE[a.notch ?? ""] ?? "bg-muted")}>{a.rating}</span> : <span className="text-muted-foreground">—</span>}</td>
                        <td className={cn("py-2 pr-3", a.outlook === "negative" || a.watch === "negative" ? "font-semibold text-rose-700" : "text-muted-foreground")}>{a.watch ? `Watch ${a.watch}` : a.outlook ? cap(a.outlook) : "—"}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{a.lastAction ? `${ACTION_LABEL[a.lastAction] ?? cap(a.lastAction)}${a.lastActionDate ? ` · ${fmtDay(a.lastActionDate)}` : ""}` : "—"}</td>
                        <td className="py-2">
                          {a.rationaleUrl ? (
                            <a href={a.rationaleUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary hover:underline">
                              Open ↗
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                      </>
                    ) : (
                      <td colSpan={4} className="py-2 text-muted-foreground">
                        Not covered in public bond registry —{" "}
                        <a
                          href={
                            a.agency === "CRISIL"
                              ? `https://www.crisil.com/en/home/our-businesses/ratings/company-factsheet.${encodeURIComponent(symbol)}.html`
                              : a.agency === "CARE"
                              ? `https://www.careratings.com/search.aspx?q=${encodeURIComponent(symbol)}`
                              : `https://www.icra.in/Rating/List?search=${encodeURIComponent(symbol)}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          Verify on {a.agency} portal ↗
                        </a>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.events.length ? (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent events</h3>
              <ul className="space-y-2">
                {data.events.slice(0, 8).map((e) => (
                  <li key={`${e.type}-${e.agency}-${e.date}-${e.detail}`} className={cn("flex flex-wrap items-start gap-2 rounded-md border p-3 text-sm", e.type === "disclosure" ? "border-border bg-card" : "border-rose-300 bg-rose-50")}>
                    <span className="text-xs font-medium text-muted-foreground">{fmtDay(e.date)}</span>
                    <span className="min-w-0 flex-1 text-foreground">{e.detail}</span>
                    {e.link ? (
                      <a href={e.link} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary hover:underline">
                        {e.type === "disclosure" ? "NSE filing ↗" : "Source ↗"}
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
            <p className="mb-1 font-semibold text-foreground">How to read the letters</p>
            <p className="flex flex-wrap gap-x-3 gap-y-1">
              {LEGEND.map(([k, v]) => (
                <span key={k}>
                  <span className="font-semibold text-foreground">{k}</span> = {v}
                </span>
              ))}
            </p>
            <p className="mt-1">A + or − (like AA+) is a finer step within a letter. We link each agency&apos;s own rationale document and never summarise it.</p>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
