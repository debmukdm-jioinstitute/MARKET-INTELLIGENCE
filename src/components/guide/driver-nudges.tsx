"use client";

import Link from "next/link";
import { Panel } from "@/components/layout/page-header";
import { useDriverNudges } from "@/hooks/use-driver-nudges";
import { usePublishMascotTip } from "@/components/mascot/mascot-bus";
import { cn } from "@/lib/utils";
import useSWR from "swr";
import type { DriverCard } from "@/lib/guide/drivers-service";
import type { DriverKind } from "@/lib/guide/business-lines";

const sign = (n: number, d = 2) => `${n >= 0 ? "+" : ""}${n.toFixed(d)}`;

type DriversResponse = { symbol: string; lines: { id: string; label: string }[]; drivers: DriverCard[] };

/** Module-level fetcher: never inline an async fn in useSWR (React #185). */
async function loadDrivers(url: string): Promise<DriversResponse> {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as DriversResponse;
}

const KIND_LABEL: Record<DriverKind, string> = { regulation: "Regulation", policy: "Government policy", commodity: "Commodity", macro: "Macro", competition: "Competition", demand: "Demand" };
const KIND_STYLE: Record<DriverKind, string> = {
  regulation: "bg-violet-100 text-violet-800",
  policy: "bg-blue-100 text-blue-800",
  commodity: "bg-amber-100 text-amber-800",
  macro: "bg-slate-100 text-slate-700",
  competition: "bg-rose-100 text-rose-800",
  demand: "bg-emerald-100 text-emerald-800",
};
const fmtAgo = (iso: string | null) => {
  const ms = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(ms)) return "";
  const days = Math.max(0, Math.round((Date.now() - ms) / 86_400_000));
  return days === 0 ? "today" : days === 1 ? "yesterday" : `${days}d ago`;
};

/** One-glance "what moves this stock" card: the driver, today's move and the implied effect, one click from the analysis. */
export function DriverNudges({ symbol, name }: { symbol: string; name: string }) {
  const { nudges, loading } = useDriverNudges(symbol, name);
  const top = nudges[0];
  const { data: biz } = useSWR<DriversResponse>(`/api/research/drivers?symbol=${encodeURIComponent(symbol)}&name=${encodeURIComponent(name)}`, loadDrivers, { revalidateOnFocus: false, dedupingInterval: 300_000 });
  const cards = biz?.drivers ?? [];
  const lead = cards[0];

  usePublishMascotTip(
    lead?.active ? `${symbol}:${lead.id}` : top ? `${symbol}:${top.factor}` : null,
    lead?.active
      ? { gesture: "point", text: `${name}: "${lead.label}" is in the news right now. Tap to see what changed.`, cta: { label: "See the drivers", href: "#what-moves" } }
      : top
      ? {
          gesture: "point",
          text:
            top.todayMove != null
              ? `${name} leans on ${top.label}. It's ${sign(top.todayMove, 1)}${top.todayUnit} today. Tap to see why.`
              : `${name} leans on ${top.label}. Tap to see the analysis.`,
          cta: { label: top.cta, href: top.href },
        }
      : null,
  );

  if (!nudges.length && !cards.length) return loading ? <p className="text-sm text-muted-foreground">Checking what moves {symbol}…</p> : null;

  return (
    <Panel
      title="What moves this stock"
      subtitle={`What actually moves ${biz?.lines.length ? biz.lines.map((l) => l.label).join(" and ") : "this business"}: the regulators, policies, commodities and competitors that change its earnings, with the latest headline on each.`}
    >
      {cards.length ? (
        <ul id="what-moves" className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((c) => (
            <li key={c.id} className="rounded-lg border border-border bg-card/50 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={cn("rounded px-1.5 py-0.5 text-xs font-semibold", KIND_STYLE[c.kind])}>{KIND_LABEL[c.kind]}</span>
                {c.active ? <span className="rounded bg-rose-600 px-1.5 py-0.5 text-xs font-semibold text-white">In the news</span> : null}
              </div>
              <p className="mt-1.5 font-semibold">{c.label}</p>
              <p className="mt-1 text-muted-foreground">{c.why}</p>
              {c.evidence.length ? (
                <ul className="mt-2 space-y-1.5 border-t border-border pt-2">
                  {c.evidence.slice(0, 2).map((e) => (
                    <li key={e.link} className="text-sm">
                      {e.company ? <span className="mr-1 rounded bg-primary/10 px-1 py-0.5 text-xs font-semibold text-primary">About {symbol}</span> : null}
                      <a href={e.link} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                        {e.title}
                      </a>
                      <span className="text-muted-foreground">
                        {e.source ? ` · ${e.source}` : ""}
                        {e.publishedAt ? ` · ${fmtAgo(e.publishedAt)}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 border-t border-border pt-2 text-sm text-muted-foreground">No fresh headline on this in the last 30 days.</p>
              )}
              {c.authorityUrl ? (
                <a href={c.authorityUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">
                  Source of truth: {c.authority} ↗
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {nudges.length ? <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Market-wide sensitivities (measured)</h3> : null}
      <ul className="grid gap-3 md:grid-cols-3">
        {nudges.map((n) => {
          const imp = n.impliedPct;
          return (
            <li key={n.factor} className="rounded-lg border border-border bg-card/50 p-3 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{n.label}</span>
                {n.todayMove != null ? (
                  <span className={cn("tabular-nums text-sm", n.todayMove >= 0 ? "text-emerald-600" : "text-rose-600")}>
                    {sign(n.todayMove, 1)}
                    {n.todayUnit} today
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-muted-foreground">{n.reason ?? n.headline}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Sector sensitivity {sign(n.beta)}
                {n.significant ? " (statistically significant)" : ""}
                {imp != null ? (
                  <>
                    {" "}
                    · implied today{" "}
                    <span className={cn("font-medium", imp >= 0 ? "text-emerald-600" : "text-rose-600")}>{sign(imp)}%</span>
                  </>
                ) : null}
              </p>
              <Link href={n.href} className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">
                {n.cta} →
              </Link>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
