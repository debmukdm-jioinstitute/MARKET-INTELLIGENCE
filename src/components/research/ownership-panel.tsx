"use client";

import { Panel } from "@/components/layout/page-header";
import { Fold, Takeaway, Tile, type Tone } from "@/components/guide/explain";
import { cn } from "@/lib/utils";
import type { OwnershipFlag, OwnershipRow } from "@/lib/research/ownership";
import { quarterLabel } from "@/lib/research/ownership";
import useSWR from "swr";

type SeriesPoint = Pick<OwnershipRow, "broadcastDate" | "quarterEnd" | "promoterPct" | "pledgePct">;
type OwnershipResponse = {
  symbol: string;
  dbConfigured: boolean;
  latest: OwnershipRow | null;
  series: SeriesPoint[];
  flags: OwnershipFlag[];
  nseUrl: string;
};

/** Module-level fetcher — never inline an async fn in useSWR (React #185). */
async function loadOwnership(url: string): Promise<OwnershipResponse> {
  const res = await fetch(url);
  const json = (await res.json()) as OwnershipResponse & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

const fmtDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const pct = (n: number | null) => (n === null ? "—" : `${n.toFixed(2)}%`);

type Slice = { label: string; value: number; color: string };

function sliceData(l: OwnershipRow): Slice[] {
  const promoter = l.promoterPct ?? 0;
  if (l.fiiPct !== null && l.diiPct !== null) {
    const others = Math.max(0, 100 - promoter - l.fiiPct - l.diiPct);
    return [
      { label: "Promoters", value: promoter, color: "var(--color-primary, #1a73e8)" },
      { label: "Foreign institutions", value: l.fiiPct, color: "#0f9d58" },
      { label: "Domestic institutions", value: l.diiPct, color: "#f9ab00" },
      { label: "Everyone else", value: others, color: "#9aa0a6" },
    ];
  }
  // Older filings only carry promoter vs public from the exchange list.
  return [
    { label: "Promoters", value: promoter, color: "var(--color-primary, #1a73e8)" },
    { label: "Public", value: l.publicPct ?? Math.max(0, 100 - promoter), color: "#9aa0a6" },
  ];
}

function Donut({ slices }: { slices: Slice[] }) {
  const R = 40;
  const C = 2 * Math.PI * R;
  const starts = slices.reduce<number[]>((acc, s, i) => [...acc, i === 0 ? 0 : acc[i - 1] + (Math.max(0, slices[i - 1].value) / 100) * C], []);
  return (
    <svg viewBox="0 0 100 100" className="size-36 shrink-0 -rotate-90" role="img" aria-label="Ownership split">
      <circle cx="50" cy="50" r={R} fill="none" stroke="#eef0f2" strokeWidth="14" />
      {slices.map((s, i) => {
        const len = (Math.max(0, s.value) / 100) * C;
        return <circle key={s.label} cx="50" cy="50" r={R} fill="none" stroke={s.color} strokeWidth="14" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-starts[i]} />;
      })}
    </svg>
  );
}

function Sparkline({ title, points, color, flagged }: { title: string; points: (number | null)[]; color: string; flagged: Set<number> }) {
  const vals = points.filter((p): p is number => p !== null);
  if (vals.length < 2) {
    return (
      <div className="rounded-lg border border-border p-3">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="mt-2 text-sm text-muted-foreground">{vals.length === 1 ? `${vals[0].toFixed(2)}% — only one quarter available so far.` : "Not enough quarters yet."}</p>
      </div>
    );
  }
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  const W = 160;
  const H = 48;
  const x = (i: number) => (points.length === 1 ? W / 2 : (i / (points.length - 1)) * (W - 8) + 4);
  const y = (v: number) => H - 6 - ((v - lo) / span) * (H - 12);
  const d = points.flatMap((p, i) => (p === null ? [] : [`${x(i).toFixed(1)},${y(p).toFixed(1)}`])).join(" ");
  const last = vals[vals.length - 1];
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-sm font-semibold tabular-nums text-foreground">{last.toFixed(2)}%</p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 h-12 w-full" role="img" aria-label={`${title}, last ${points.length} quarters`}>
        <polyline points={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (p === null ? null : <circle key={i} cx={x(i)} cy={y(p)} r={flagged.has(i) ? 3.5 : 2} fill={flagged.has(i) ? "#d93025" : color} />))}
      </svg>
      <p className="mt-1 text-xs text-muted-foreground">
        Low {lo.toFixed(2)}% · High {hi.toFixed(2)}% (last {points.length} quarters)
      </p>
    </div>
  );
}

export function OwnershipPanel({ symbol }: { symbol: string }) {
  const { data, error, isLoading } = useSWR<OwnershipResponse>(`/api/research/ownership?symbol=${encodeURIComponent(symbol)}`, loadOwnership, { revalidateOnFocus: false });
  const l = data?.latest ?? null;
  const flaggedDates = new Set(data?.flags.map((f) => f.broadcastDate) ?? []);
  const flaggedIdx = new Set((data?.series ?? []).flatMap((p, i) => (flaggedDates.has(p.broadcastDate) ? [i] : [])));

  return (
    <Panel
      id="shareholding"
      title="Who owns it (Shareholding Pattern)"
      subtitle="Promoter, institution and pledge holding from the company's quarterly filings with NSE."
      trust={{ source: "NSE shareholding pattern filings (XBRL)", asOf: l ? `${l.broadcastDate}T00:00:00Z` : null, note: "Filed data shown as filed — not investment advice" }}
    >
      {isLoading ? <p className="animate-pulse text-sm text-muted-foreground">Loading ownership for {symbol}…</p> : null}
      {error ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Could not load ownership data right now. Try again in a moment.</p> : null}
      {data && !error && !l ? (
        <p className="text-sm text-muted-foreground">
          No shareholding filings collected for {symbol} yet.{" "}
          <a href={data.nseUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            See NSE directly ↗
          </a>
        </p>
      ) : null}

      {data && !error && l ? (
        <div className="space-y-5">
          {(() => {
            const pledge = l.pledgePct ?? 0;
            const high = data.flags.some((f) => f.severity === "high");
            const tone: Tone = high || pledge >= 25 ? "bad" : data.flags.length || pledge >= 5 ? "watch" : "good";
            const promoter = l.promoterPct != null ? `${l.promoterPct.toFixed(1)}%` : null;
            const line =
              tone === "good"
                ? `${promoter ? `Founders and promoters own ${promoter}. ` : ""}${pledge > 0 ? `${pledge.toFixed(1)}% of their shares are pledged, which is low.` : "None of their shares are pledged for loans."}`
                : tone === "watch"
                  ? `${promoter ? `Promoters own ${promoter}, ` : ""}but ${pledge >= 5 ? `${pledge.toFixed(1)}% of their shares are pledged for loans` : "a recent change in holding is flagged"}. Worth a look.`
                  : `Warning: ${pledge >= 25 ? `${pledge.toFixed(1)}% of promoter shares are pledged for loans` : "a serious holding change is flagged"}. If those loans go bad, shares can be sold forcibly.`;
            return <Takeaway tone={tone}>{line}</Takeaway>;
          })()}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Promoters own" value={pct(l.promoterPct)} hint="The people who started or run the company." />
            <Tile label="Foreign funds own" value={l.fiiPct != null ? pct(l.fiiPct) : "—"} hint={l.fiiPct != null ? "Overseas institutions (FIIs)." : "Not split out in this older filing."} />
            <Tile label="Indian funds own" value={l.diiPct != null ? pct(l.diiPct) : "—"} hint={l.diiPct != null ? "Mutual funds, insurers and banks (DIIs)." : "Not split out in this older filing."} />
            <Tile label="Promoter shares pledged" value={pct(l.pledgePct)} hint="Shares given as security for loans. Lower is safer." tone={(l.pledgePct ?? 0) >= 25 ? "bad" : (l.pledgePct ?? 0) >= 5 ? "watch" : "good"} />
          </div>
          {data.flags.length ? (
            <ul className="space-y-2">
              {data.flags.map((f) => (
                <li key={`${f.label}-${f.broadcastDate}`} className={cn("flex flex-wrap items-start gap-2 rounded-md border p-3 text-sm", f.severity === "high" ? "border-rose-300 bg-rose-50" : "border-amber-300 bg-amber-50")}>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-sm font-semibold", f.severity === "high" ? "bg-rose-600 text-white" : "bg-amber-500 text-white")}>{f.label}</span>
                  <span className="min-w-0 flex-1 text-foreground">{f.detail}</span>
                  {f.filingUrl ? (
                    <a href={f.filingUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary hover:underline">
                      Filing ↗
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <Donut slices={sliceData(l)} />
            <ul className="grid flex-1 gap-1.5 text-sm">
              {sliceData(l).map((s) => (
                <li key={s.label} className="flex items-center gap-2">
                  <span className="size-3 rounded-sm" style={{ background: s.color }} aria-hidden />
                  <span className="text-foreground">{s.label}</span>
                  <span className="ml-auto tabular-nums text-muted-foreground">{pct(s.value)}</span>
                </li>
              ))}
              <li className="mt-1 text-sm text-muted-foreground">
                Pledged / encumbered promoter shares: <span className="font-semibold text-foreground">{pct(l.pledgePct)}</span>
                {l.shareholderCount ? ` · ${l.shareholderCount.toLocaleString("en-IN")} shareholders` : ""}
              </li>
              <li className="text-sm text-muted-foreground">
                {quarterLabel(l)} quarter · filed with NSE on {fmtDay(l.broadcastDate)}{" "}
                {l.xbrlUrl ? (
                  <a href={l.xbrlUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Source filing ↗
                  </a>
                ) : (
                  <a href={data.nseUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    NSE ↗
                  </a>
                )}
              </li>
            </ul>
          </div>

          <Fold title="How it changed over the last quarters">
          <div className="grid gap-3 sm:grid-cols-2">
            <Sparkline title="Promoter holding" points={data.series.map((p) => p.promoterPct)} color="#1a73e8" flagged={flaggedIdx} />
            <Sparkline title="Promoter shares pledged" points={data.series.map((p) => p.pledgePct)} color="#d93025" flagged={flaggedIdx} />
          </div>

          <p className="rounded-md bg-muted p-3 text-sm leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Promoter</span> = the people who started or run the company.{" "}
            <span className="font-semibold text-foreground">Pledge</span> = promoter shares given as collateral for loans — a high pledge can mean forced selling if those loans go bad. Red dots mark quarters with a warning.
          </p>
          </Fold>
        </div>
      ) : null}
    </Panel>
  );
}
