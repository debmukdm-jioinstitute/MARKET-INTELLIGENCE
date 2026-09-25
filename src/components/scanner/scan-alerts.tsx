"use client";

import { Panel } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";

type Bias = "buy" | "sell" | "watch";
type Payload = {
  run: { asOf: string; lastBar: string; universe: number; scanned: number } | null;
  scanners: { id: string; label: string; description: string; bias: Bias; matches: number; top: { symbol: string; changePct: number }[] }[];
  results?: { symbol: string; name: string; ltp: number; changePct: number; note: string }[];
  symbolHits?: { scanner: string; label: string; bias: Bias; symbol: string; name: string; ltp: number; changePct: number; note: string }[];
};

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json() as Promise<Payload>);
const dot = { buy: "bg-emerald-500", sell: "bg-rose-500", watch: "bg-blue-500" } as const;

/** Live scan alerts (from the daily Nifty 500 scan) plus an on-demand scanner console. */
export function ScanAlerts() {
  const { data } = useSWR("/api/scanner", fetcher, { refreshInterval: 5 * 60_000 });
  const [cmd, setCmd] = useState("");
  const [out, setOut] = useState<{ title: string; lines: { symbol: string; text: string; up: boolean | null }[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const actionable = (data?.scanners ?? []).filter((s) => s.bias !== "watch" && s.matches > 0);

  async function run(input: string) {
    const q = input.trim().replace(/^\//, "");
    if (!q || !data) return;
    setBusy(true);
    try {
      const lower = q.toLowerCase();
      const sc = data.scanners.find((s) => s.id === lower) ?? data.scanners.find((s) => s.label.toLowerCase().includes(lower));
      if (sc) {
        const j = await fetcher(`/api/scanner?scanner=${sc.id}`);
        setOut({
          title: `${sc.label} — ${sc.matches} match${sc.matches === 1 ? "" : "es"}`,
          lines: (j.results ?? []).slice(0, 15).map((r) => ({ symbol: r.symbol, text: `${r.ltp.toLocaleString("en-IN", { maximumFractionDigits: 2 })}  ${r.changePct >= 0 ? "+" : ""}${r.changePct.toFixed(2)}%  ${r.note}`, up: r.changePct >= 0 })),
        });
      } else {
        const j = await fetcher(`/api/scanner?symbol=${encodeURIComponent(q)}`);
        const hits = j.symbolHits ?? [];
        setOut({
          title: hits.length ? `${q.toUpperCase()} is flagged by ${hits.length} scanner${hits.length === 1 ? "" : "s"}` : `${q.toUpperCase()}: no scanner flags this stock (or it is not in the Nifty 500)`,
          lines: hits.map((h) => ({ symbol: h.label, text: h.note, up: h.bias === "buy" ? true : h.bias === "sell" ? false : null })),
        });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Scan alerts"
        subtitle={data?.run ? `Session ${data.run.lastBar} · ${data.run.scanned} Nifty 500 stocks scanned · updated ${new Date(data.run.asOf).toLocaleString()}` : "Signals from the daily Nifty 500 scan."}
        action={<Link href="/intelligence/scanner" className="text-sm text-primary hover:underline">All scanners →</Link>}
      >
        {!data?.run ? <p className="text-sm text-muted-foreground">No scan has run yet. Alerts appear after the next NSE close.</p> : null}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {actionable.map((s) => (
            <button key={s.id} type="button" onClick={() => run(s.id)} className="rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className={cn("size-2 rounded-full", dot[s.bias])} />
                  {s.label}
                </span>
                <span className="tabular-nums text-sm text-muted-foreground">{s.matches}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {s.top.map((t) => (
                  <span key={t.symbol} className="mr-2">
                    {t.symbol} <span className={t.changePct >= 0 ? "text-emerald-600" : "text-rose-600"}>{t.changePct >= 0 ? "+" : ""}{t.changePct.toFixed(1)}%</span>
                  </span>
                ))}
              </p>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="Scanner console" subtitle="Type a scanner (e.g. /vcp, /high52w, volume) or a stock symbol (e.g. INFY) to see what flags it.">
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(cmd);
          }}
        >
          <input value={cmd} onChange={(e) => setCmd(e.target.value)} placeholder="/vcp  ·  /golden-cross  ·  INFY" className="min-w-64 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <button type="submit" disabled={busy || !data} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? "Running…" : "Run"}
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {(data?.scanners ?? []).slice(0, 12).map((s) => (
            <button key={s.id} type="button" onClick={() => { setCmd(`/${s.id}`); run(s.id); }} className="rounded-full border border-border bg-card px-2.5 py-1 text-xs hover:bg-accent">
              /{s.id}
            </button>
          ))}
        </div>
        {out ? (
          <div className="mt-4 rounded-lg border border-border bg-card p-3 text-sm">
            <p className="mb-2 font-semibold">{out.title}</p>
            <ul className="space-y-1">
              {out.lines.map((l, i) => (
                <li key={i} className="flex flex-wrap gap-x-3">
                  <span className={cn("font-semibold", l.up === null ? "" : l.up ? "text-emerald-600" : "text-rose-600")}>{l.symbol}</span>
                  <span className="text-muted-foreground">{l.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
