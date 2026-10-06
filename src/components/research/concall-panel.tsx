"use client";

import { Panel } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import { useState } from "react";
import useSWR from "swr";

type Summary = {
  quarter: string | null;
  transcriptDate: string | null;
  guidance: string[];
  growthDrivers: string[];
  risks: string[];
  qaThemes: string[];
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
      <div className="flex justify-between text-xs text-muted-foreground">
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

export function ConcallPanel({ symbol }: { symbol: string }) {
  const [market, setMarket] = useState<"IN" | "US">("IN");
  const { data, error, isLoading } = useSWR<ConcallResponse>(`/api/research/concall?symbol=${encodeURIComponent(symbol)}&market=${market}`, loadConcall, { revalidateOnFocus: false });
  const [more, setMore] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const s = data?.history?.find((r) => r.sourceUrl === selected) ?? data?.summary ?? null;
  const usedModel = s ? /finbert|distilbart/i.test(s.generatedBy) : false;
  const abstractive = s ? /distilbart/i.test(s.generatedBy) : false;
  const delta = s?.toneDelta ?? null;

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
        <div className="space-y-4">
          <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{usedModel ? "AI summary of the linked transcript — read the original for exact wording." : "Auto-extracted from the linked transcript — read the original for exact wording."}</span>{" "}
            {s.quarter ? `${s.quarter} · ` : ""}{s.transcriptDate ? `dated ${fmtDay(s.transcriptDate)}` : "date not verified"} ·{" "}
            <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
              Open original transcript ↗
            </a>{" "}
            · Method: {s.generatedBy}. {s.generatedBy.includes("prepared-only") ? "Q&A could not be reliably identified; only prepared remarks are shown. " : ""}Text in quotation marks is copied word for word.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <section>
              <h3 className="mb-2 text-sm font-semibold text-foreground">What management guided (quantitative)</h3>
              <Bullets items={s.guidance} quoted />
            </section>
            <section>
              <h3 className="mb-2 text-sm font-semibold text-foreground">What analysts pushed on in Q&amp;A</h3>
              <Bullets items={s.qaThemes} quoted />
            </section>
          </div>

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
                <p className="text-xs text-muted-foreground">Scale: −1 very negative, +1 very positive (FinBERT reading of the words used). A cooler Q&amp;A than prepared remarks is the signal to watch.</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Tone was not scored for this call (the scoring model was unavailable when it was processed).</p>
            )}
          </div>

          <div>
            <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more} className="text-xs font-semibold text-primary hover:underline">
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
