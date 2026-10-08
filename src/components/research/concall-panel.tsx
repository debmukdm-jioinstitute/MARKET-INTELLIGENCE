"use client";

import { Panel } from "@/components/layout/page-header";
import { Fold, Takeaway, type Tone } from "@/components/guide/explain";
import { resolveQaPairsForSummary, type QaItem } from "@/lib/research/concall-qa";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import useSWR from "swr";

type Summary = {
  quarter: string | null;
  transcriptDate: string | null;
  guidance: string[];
  growthDrivers: string[];
  risks: string[];
  qaThemes: string[];
  qaPairs?: QaItem[];
  tonePrepared: number | null;
  toneQa: number | null;
  toneDelta: number | null;
  sourceUrl: string;
  generatedBy: string;
};
type ConcallResponse = { symbol: string; dbConfigured: boolean; summary: Summary | null; history?: Summary[]; documents?: { title: string; url: string }[]; message?: string };

/** Module-level fetcher — never inline an async fn in useSWR (React #185). */
async function loadConcall(url: string): Promise<ConcallResponse> {
  const res = await fetch(url);
  const json = (await res.json()) as ConcallResponse & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

const fmtDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const DELTA_BAND = 0.1;

/** −1..+1 → 0..100% marker position. */
const pos = (v: number) => `${((Math.max(-1, Math.min(1, v)) + 1) * 50).toFixed(1)}%`;

function ToneMeter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{value >= 0 ? "+" : ""}{value.toFixed(2)}</span>
      </div>
      <div className="relative mt-1 h-2 rounded-full bg-gradient-to-r from-rose-200 via-muted to-emerald-200">
        <span className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow" style={{ left: pos(value) }} />
      </div>
    </div>
  );
}

function Bullets({ items, quoted }: { items: string[]; quoted: boolean }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">None picked out of this call.</p>;
  return (
    <ul className="space-y-2 text-sm text-foreground">
      {items.map((t) => (
        <li key={t} className="rounded-md border border-border bg-card p-2.5">
          {quoted ? `“${t}”` : t}
        </li>
      ))}
    </ul>
  );
}

function QaBentoList({ items }: { items: QaItem[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">None picked out of this call.</p>;

  return (
    <div className="space-y-3.5">
      {items.map((item, idx) => {
        const isPositive = item.tone === "positive";
        const isNegative = item.tone === "negative";

        return (
          <div
            key={idx}
            className={cn(
              "group relative flex flex-col justify-between overflow-hidden rounded-xl p-4 transition-all duration-200",
              // Positive tone: light green tinted subtle
              isPositive && "border border-emerald-300/70 bg-emerald-50/50 shadow-xs hover:border-emerald-400 hover:shadow-[0_8px_20px_-6px_rgba(16,185,129,0.18)] dark:border-emerald-800/50 dark:bg-emerald-950/20",
              // Negative tone: light red subtle glass morphism 3D design
              isNegative && "backdrop-blur-md border border-rose-300/80 bg-rose-50/65 shadow-[0_10px_25px_-4px_rgba(244,63,94,0.18),0_2px_4px_-1px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.85)] hover:shadow-[0_14px_32px_-6px_rgba(244,63,94,0.28),inset_0_1px_1px_rgba(255,255,255,0.95)] hover:-translate-y-0.5 ring-1 ring-white/60 dark:border-rose-800/60 dark:bg-rose-950/30 dark:shadow-[0_10px_25px_-4px_rgba(244,63,94,0.3),inset_0_1px_1px_rgba(255,255,255,0.08)] dark:ring-rose-500/10",
              // Neutral tone: subtle neutral card
              !isPositive && !isNegative && "border border-border/80 bg-card/75 shadow-xs hover:border-border hover:shadow-md backdrop-blur-xs"
            )}
          >
            {/* Top row: Analyst attribution & Sentiment pill badge */}
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium tracking-wide",
                  isPositive && "bg-emerald-100/90 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
                  isNegative && "bg-rose-100/90 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
                  !isPositive && !isNegative && "bg-muted text-muted-foreground"
                )}
              >
                <span className="text-[11px]">❓</span>
                <span className="truncate max-w-[240px]">{item.analystSpeaker || `Analyst Question ${idx + 1}`}</span>
              </span>

              {/* Predefined Sentiment Badge */}
              {isPositive ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 shadow-xs">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Positive tone {typeof item.toneScore === "number" && item.toneScore !== 0 ? `(${item.toneScore > 0 ? "+" : ""}${item.toneScore.toFixed(2)})` : ""}
                </span>
              ) : isNegative ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-rose-500/35 bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 dark:text-rose-300 shadow-xs">
                  <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
                  Cautious tone {typeof item.toneScore === "number" && item.toneScore !== 0 ? `(${item.toneScore.toFixed(2)})` : ""}
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/70 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-muted-foreground" />
                  Neutral tone
                </span>
              )}
            </div>

            {/* Analyst Question Body */}
            <p className="mt-2 text-sm font-medium leading-relaxed text-foreground">
              “{item.question}”
            </p>

            {/* Management Answer Nested Bento Box */}
            <div className="mt-3.5 pt-3 border-t border-border/40">
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
                  <span className="inline-flex size-4.5 items-center justify-center rounded-full bg-primary/10 text-xs">
                    👔
                  </span>
                  <span>{item.managementSpeaker || "Management Response"}</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                  Management Answer
                </span>
              </div>
              <div
                className={cn(
                  "rounded-lg p-3 text-sm leading-relaxed",
                  isPositive && "bg-white/80 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/40 text-foreground shadow-xs",
                  isNegative && "bg-white/85 dark:bg-rose-950/35 border border-rose-200/70 dark:border-rose-800/40 text-foreground shadow-xs backdrop-blur-xs",
                  !isPositive && !isNegative && "bg-muted/40 border border-border/40 text-foreground"
                )}
              >
                <p>{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ConcallPanel({ symbol }: { symbol: string }) {
  const [market, setMarket] = useState<"IN" | "US">("IN");
  const { data, error, isLoading } = useSWR<ConcallResponse>(`/api/research/concall?symbol=${encodeURIComponent(symbol)}&market=${market}`, loadConcall, { revalidateOnFocus: false });
  const [more, setMore] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const s = data?.history?.find((r) => r.sourceUrl === selected) ?? data?.summary ?? null;
  const usedModel = s ? /finbert|distilbart/i.test(s.generatedBy) : false;
  const abstractive = s ? /distilbart/i.test(s.generatedBy) : false;
  const delta = s?.toneDelta ?? null;

  const qaItems = useMemo(() => (s ? resolveQaPairsForSummary(s) : []), [s]);

  return (
    <Panel
      id="concalls"
      title="Earnings Concalls (Said vs Guided)"
      subtitle="What management guided in the earnings call versus what analysts pushed on afterwards."
      trust={{ source: "Linked company / exchange earnings-call transcript", asOf: s?.transcriptDate ? `${s.transcriptDate}T00:00:00Z` : null, note: "Automated reading of a transcript — not investment advice" }}
    >
      <label className="mb-3 block text-sm">Transcript market <select aria-label="Transcript market" value={market} onChange={(e) => setMarket(e.target.value as "IN" | "US")} className="ml-2 rounded border border-border bg-background p-2"><option value="IN">India</option><option value="US">United States</option></select></label>
      {isLoading ? <p className="animate-pulse text-sm text-muted-foreground">Loading call summary for {symbol}…</p> : null}
      {error ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Could not load the call summary right now. Try again in a moment.</p> : null}
      {data && !error && !s ? <p className="text-sm text-muted-foreground">{data.message ?? "Transcript archives are temporarily unavailable. This does not mean the company has no transcripts."}</p> : null}

      {(data?.history?.length ?? 0) > 1 ? <label className="mb-3 block text-sm">Archived calls <select aria-label="Select earnings call" value={s?.sourceUrl ?? ""} onChange={(e) => setSelected(e.target.value)} className="ml-2 rounded border border-border bg-background p-2">{data!.history!.map((r) => <option key={r.sourceUrl} value={r.sourceUrl}>{r.quarter ?? r.transcriptDate ?? "Archived call"}</option>)}</select></label> : null}
      {data?.documents?.length ? <details className="mb-3 text-sm"><summary className="cursor-pointer text-primary">Original transcript archive ({data.documents.length})</summary><ul className="mt-2 space-y-2">{data.documents.map((d) => <li key={d.url}><a href={d.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{d.title} ↗</a></li>)}</ul></details> : null}
      {s ? (
        <div className="space-y-5">
          {(() => {
            const tone: Tone = delta === null ? "info" : delta < -DELTA_BAND ? "watch" : delta > DELTA_BAND ? "good" : "info";
            const line =
              delta === null
                ? `Here is what management said on the ${s.quarter ?? "latest"} earnings call.`
                : delta < -DELTA_BAND
                  ? "Management sounded confident in the prepared speech, but cooler when analysts asked questions. Read the Q&A themes below."
                  : delta > DELTA_BAND
                    ? "Management sounded even more positive when analysts asked questions, a good sign."
                    : "Management sounded the same in the speech and in the Q&A: steady.";
            return <Takeaway tone={tone} sub={`${s.quarter ? `${s.quarter} call · ` : ""}${s.transcriptDate ? `dated ${fmtDay(s.transcriptDate)}` : "date not verified"}. Quoted text is copied word for word.`}>{line}</Takeaway>;
          })()}

          <div className="grid gap-4 md:grid-cols-2">
            <section>
              <h3 className="mb-2 text-base font-semibold text-foreground">What management promised (numbers)</h3>
              <Bullets items={s.guidance} quoted />
            </section>
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">What analysts pushed on</h3>
                {qaItems.length > 0 ? (
                  <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {qaItems.length} Q&amp;A highlights
                  </span>
                ) : null}
              </div>
              <QaBentoList items={qaItems} />
            </section>
          </div>

          <Fold title="Tone of the call, in detail">
          <div className="rounded-lg border border-border p-3">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Tone of the call</h3>
            {s.tonePrepared !== null && s.toneQa !== null ? (
              <div className="space-y-3">
                <ToneMeter label="Prepared remarks" value={s.tonePrepared} />
                <ToneMeter label="Q&A" value={s.toneQa} />
                {delta !== null ? (
                  <p className={cn("text-sm font-semibold", delta < -DELTA_BAND ? "text-rose-700" : delta > DELTA_BAND ? "text-emerald-700" : "text-muted-foreground")}>
                    {delta < -DELTA_BAND ? "Tone cooled in Q&A" : delta > DELTA_BAND ? "Tone warmed in Q&A" : "Tone held steady"} ({delta >= 0 ? "+" : ""}{delta.toFixed(2)})
                  </p>
                ) : null}
                <p className="text-sm text-muted-foreground">Scale: −1 very negative, +1 very positive (read from the words used, scored on our own finance word list). A cooler Q&amp;A than prepared remarks is the signal to watch.</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Tone could not be read for this call: the transcript has too little scoreable language, or no separate Q&A section was found.</p>
            )}
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {usedModel ? "Summary written automatically from the linked transcript" : "Extracted automatically from the linked transcript"}. Method: {s.generatedBy}. {s.generatedBy.includes("prepared-only") ? "Q&A could not be reliably identified, so only prepared remarks are shown. " : ""}
            <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">Open the original transcript ↗</a>
          </p>
          </Fold>

          <div>
            <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more} className="text-sm font-semibold text-primary hover:underline">
              {more ? "Hide" : "Show"} growth drivers and risks
            </button>
            {more ? (
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">Growth drivers mentioned</h3>
                  <Bullets items={s.growthDrivers} quoted={!abstractive} />
                </section>
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">Risks and headwinds mentioned</h3>
                  <Bullets items={s.risks} quoted={!abstractive} />
                </section>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
