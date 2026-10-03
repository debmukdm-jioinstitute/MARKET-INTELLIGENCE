"use client";

import { Panel } from "@/components/layout/page-header";
import { ALL_SOURCES, overlaySeries, QUADRANT_LABEL, quadrantOf, SOURCE_LABEL, type QuadrantPoint, type SourceDigest, type SourceId } from "@/lib/research/sentiment";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { signClass } from "@/lib/sign-color";

type TrendsResponse = { keyword: string; note: string; dbConfigured: boolean; searchTerm?: string; fetchedAt?: string; series: { points: { d: string; v: number }[]; momentum: string | null; recentChangePct: number | null; yearOnYearChangePct: number | null } | null; risingQueries: string[]; source?: { label: string; url: string } };
type SentimentResponse = { dbConfigured: boolean; note: string; digest?: SourceDigest[]; points?: QuadrantPoint[] };

/** Module-level fetcher — never inline an async fn in useSWR (React #185). */
async function loadJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}
const loadTrends = (url: string) => loadJson<TrendsResponse>(url);
const loadSentiment = (url: string) => loadJson<SentimentResponse>(url);

const fmtDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit", timeZone: "UTC" });

/* ------------------------------------------------------------------ */

function TrendsOverlay({ symbol, candles }: { symbol: string; candles: { ts: string; close: number }[] }) {
  const { data, error, isLoading } = useSWR<TrendsResponse>(`/api/research/trends?keyword=${encodeURIComponent(symbol)}`, loadTrends, { revalidateOnFocus: false });
  const pts = data?.series?.points ?? [];
  const merged = overlaySeries(pts, candles);
  const W = 640;
  const H = 170;
  const x = (i: number) => (merged.length <= 1 ? W / 2 : 8 + (i / (merged.length - 1)) * (W - 16));
  const y = (v: number) => H - 10 - (v / 100) * (H - 20);
  const line = (key: "trend" | "price") => merged.flatMap((m, i) => (m[key] === null ? [] : [`${x(i).toFixed(1)},${y(m[key]!).toFixed(1)}`])).join(" ");

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Attention vs price</h3>
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Google Trends is 0–100 relative interest, not absolute search volume.</span> Both lines are rescaled to 0–100 so you can compare their shape, not their size.
      </p>
      {isLoading ? <p className="animate-pulse text-sm text-muted-foreground">Loading search interest…</p> : null}
      {error ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Could not load search interest right now.</p> : null}
      {data && !error && pts.length < 4 ? (
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          No Google Trends data collected for {symbol} yet. We refresh a rotating batch of companies weekly, so it can take a few weeks to reach every name.
          {data.dbConfigured ? "" : " (Database not configured on this deployment.)"}
        </p>
      ) : null}
      {pts.length >= 4 ? (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full rounded-md border border-border bg-card" role="img" aria-label="Search interest and price, both scaled 0 to 100">
            {[25, 50, 75].map((g) => (
              <line key={g} x1="8" x2={W - 8} y1={y(g)} y2={y(g)} stroke="#e8eaed" strokeDasharray="3 4" />
            ))}
            <polyline points={line("price")} fill="none" stroke="#5f6368" strokeWidth="2" strokeLinejoin="round" />
            <polyline points={line("trend")} fill="none" stroke="#1a73e8" strokeWidth="2.5" strokeLinejoin="round" />
          </svg>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span><span className="mr-1 inline-block h-0.5 w-4 align-middle" style={{ background: "#1a73e8" }} />Google search interest (India)</span>
            <span><span className="mr-1 inline-block h-0.5 w-4 align-middle" style={{ background: "#5f6368" }} />Share price</span>
            <span>{fmtDay(pts[0].d)} → {fmtDay(pts[pts.length - 1].d)}</span>
            {data?.series?.momentum ? <span>Interest is {data.series.momentum}{data.series.recentChangePct !== null ? <span className={signClass(data.series.recentChangePct)}>{` (${data.series.recentChangePct >= 0 ? "+" : ""}${data.series.recentChangePct}% vs the previous 13 weeks)`}</span> : ""}</span> : null}
          </div>
          {data?.risingQueries.length ? <p className="text-xs text-muted-foreground">Rising related searches: {data.risingQueries.join(" · ")}</p> : null}
          {data?.source ? (
            <p className="text-xs text-muted-foreground">
              Source:{" "}
              <a href={data.source.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                {data.source.label} ↗
              </a>
              {data.searchTerm ? ` · searched “${data.searchTerm}”` : ""}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SourceCard({ d }: { d: SourceDigest }) {
  return (
    <li className={cn("rounded-lg border p-3 text-sm", d.live ? "border-border bg-card" : "border-dashed border-border bg-muted/40")}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-foreground">{SOURCE_LABEL[d.source]}</span>
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", d.live ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground")}>{d.live ? "Live" : "Not live"}</span>
      </div>
      {d.mentions > 0 ? (
        <>
          <p className="mt-1 text-foreground">
            {d.mentions.toLocaleString("en-IN")} {d.source === "gdelt" ? "news articles" : "mentions"} this week
            {d.bullishPct !== null ? `, ${d.bullishPct}% bullish` : ""}
          </p>
          {d.themes.length ? <p className="mt-1 text-xs text-muted-foreground">Themes: {d.themes.join(" · ")}</p> : null}
        </>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">{d.live ? "Nothing about this company this week." : "No recent data from this source."}</p>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */

const W = 520;
const H = 300;
const X_MIN = -2;
const X_MAX = 6;
const px = (z: number) => 40 + ((Math.max(X_MIN, Math.min(X_MAX, z)) - X_MIN) / (X_MAX - X_MIN)) * (W - 60);
const py = (s: number) => H - 30 - ((Math.max(-1, Math.min(1, s)) + 1) / 2) * (H - 50);

function BuzzQuadrant({ symbol }: { symbol: string }) {
  const { data, error, isLoading } = useSWR<SentimentResponse>("/api/research/sentiment?view=quadrant", loadSentiment, { revalidateOnFocus: false });
  const [picked, setPicked] = useState<string | null>(null);
  const points = data?.points ?? [];
  const active = points.find((p) => p.symbol === (picked ?? symbol)) ?? null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Buzz quadrant — which stocks are being talked about, and how people feel</h3>
      {isLoading ? <p className="animate-pulse text-sm text-muted-foreground">Loading the buzz map…</p> : null}
      {error ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Could not load the buzz map right now.</p> : null}
      {data && !error && points.length === 0 ? (
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          Not enough history yet. A stock appears here once we have 7+ days of mentions to compare today against — the map fills in as data builds up.
        </p>
      ) : null}
      {points.length ? (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-72 w-full rounded-md border border-border bg-card" role="img" aria-label="Volume versus sentiment scatter">
            <rect x={px(1)} y={20} width={W - 20 - px(1)} height={py(0) - 20} fill="#e6f4ea" opacity="0.5" />
            <rect x={px(1)} y={py(0)} width={W - 20 - px(1)} height={H - 30 - py(0)} fill="#fce8e6" opacity="0.5" />
            <line x1="40" x2={W - 20} y1={py(0)} y2={py(0)} stroke="#9aa0a6" />
            <line x1={px(1)} x2={px(1)} y1="20" y2={H - 30} stroke="#9aa0a6" strokeDasharray="4 4" />
            <text x={W - 24} y="34" textAnchor="end" fontSize="10" fill="#188038">{QUADRANT_LABEL["talked-up"]}</text>
            <text x={W - 24} y={H - 36} textAnchor="end" fontSize="10" fill="#c5221f">{QUADRANT_LABEL["talked-down"]}</text>
            <text x="44" y="34" fontSize="10" fill="#5f6368">Quiet, positive</text>
            <text x="44" y={H - 36} fontSize="10" fill="#5f6368">Quiet, negative</text>
            <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="#5f6368">More unusual chatter than usual →</text>
            <text x="10" y={H / 2} fontSize="10" fill="#5f6368" transform={`rotate(-90 10 ${H / 2})`} textAnchor="middle">Happier ↑</text>
            {points.map((p) => {
              const q = quadrantOf(p);
              const isMe = p.symbol === symbol;
              return (
                <g key={p.symbol} onClick={() => setPicked(p.symbol)} className="cursor-pointer" role="button" aria-label={`${p.symbol}: ${QUADRANT_LABEL[q]}`}>
                  <circle cx={px(p.volumeZ)} cy={py(p.sentiment)} r={isMe || picked === p.symbol ? 7 : 5} fill={p.sentiment >= 0 ? "#34a853" : "#ea4335"} fillOpacity={isMe || picked === p.symbol ? 1 : 0.65} stroke={isMe ? "#1a73e8" : "white"} strokeWidth={isMe ? 2 : 1} />
                  {isMe || picked === p.symbol || p.buzzing ? <text x={px(p.volumeZ) + 8} y={py(p.sentiment) + 3} fontSize="9" fill="#202124">{p.symbol}</text> : null}
                </g>
              );
            })}
          </svg>
          {active ? (
            <p className="rounded-md bg-muted p-3 text-xs text-foreground">
              <Link href={`/research/${encodeURIComponent(active.symbol)}`} className="font-semibold text-primary hover:underline">
                {active.symbol}
              </Link>{" "}
              — {QUADRANT_LABEL[quadrantOf(active)]} · {active.mentions} mentions · {active.buzzing ? "buzzing · " : ""}
              {active.topics.length ? `top themes: ${active.topics.slice(0, 3).join(" · ")}` : "no clear theme yet"}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Tap a dot to see what people are discussing about that stock.</p>
          )}
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function BuzzSentimentSection({ symbol, candles }: { symbol: string; candles: { ts: string; close: number }[] }) {
  const { data, error, isLoading } = useSWR<SentimentResponse>(`/api/research/sentiment?symbol=${encodeURIComponent(symbol)}&days=30`, loadSentiment, { revalidateOnFocus: false });
  const digest = data?.digest ?? [];
  const live = digest.filter((d) => d.live).map((d) => SOURCE_LABEL[d.source]);
  const notLive = (ALL_SOURCES as SourceId[]).filter((s) => !digest.find((d) => d.source === s)?.live).map((s) => SOURCE_LABEL[s]);

  return (
    <Panel
      title="Buzz & sentiment"
      subtitle="Search interest, social chatter and news attention — what people are paying attention to, separate from price."
      trust={{ source: "Google Trends, Reddit, Telegram, YouTube, GDELT news", note: "Counts and themes only — not investment advice" }}
    >
      <div className="space-y-6">
        <TrendsOverlay symbol={symbol} candles={candles} />

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">What people are saying about {symbol} (last 7 days)</h3>
          {isLoading ? <p className="animate-pulse text-sm text-muted-foreground">Loading chatter…</p> : null}
          {error ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Could not load chatter right now.</p> : null}
          {data && !error ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {digest.map((d) => (
                <SourceCard key={d.source} d={d} />
              ))}
            </ul>
          ) : null}
          <p className="text-xs text-muted-foreground">Aggregates only — we never quote or show individual users.</p>
        </div>

        <BuzzQuadrant symbol={symbol} />

        <p className="rounded-md bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Sources:</span> live right now — {live.length ? live.join(", ") : "none yet"}
          {notLive.length ? `; not live — ${notLive.join(", ")}` : ""}. Reddit comes from a volunteer-run public mirror and can disappear; each source works on its own. X/Twitter isn&apos;t available on any free API, so we don&apos;t track it. Telegram covers channel posts only, not discussion-group comments.
        </p>
      </div>
    </Panel>
  );
}
