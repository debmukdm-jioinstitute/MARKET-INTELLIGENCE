"use client";

import { Lines } from "@/components/charts/terminal-charts";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { quoteMap, useFeedHub } from "@/hooks/use-feed-hub";
import { alignedSeries, getReturn, lastClose } from "@/lib/market";
import { formatPct } from "@/lib/format";
import { UNIVERSE } from "@/lib/universe";
import { useEffect, useState } from "react";

export default function ResearchPage() {
  const [q, setQ] = useState("NVDA");
  const { data } = useFeedHub(60_000);
  const live = quoteMap(data);
  const instrument = UNIVERSE.find((u) => u.symbol === q.toUpperCase()) ?? UNIVERSE.find((u) => u.symbol === "NVDA")!;
  const quote = live.get(instrument.symbol);

  const [history, setHistory] = useState<{ date: string; px: number }[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/feeds/quotes/${instrument.symbol}`);
        if (!res.ok) throw new Error("history");
        const json = (await res.json()) as { points?: { date: string; value: number }[] };
        if (cancelled) return;
        if (json.points?.length) {
          setHistory(json.points.map((p) => ({ date: p.date, px: Number(p.value.toFixed(2)) })));
          return;
        }
      } catch {
        /* fallback */
      }
      if (!cancelled) {
        setHistory(
          alignedSeries(instrument.symbol, "2022-01-03").map((p) => ({
            date: p.date,
            px: Number(p.value.toFixed(2)),
          })),
        );
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [instrument.symbol]);

  const peers = UNIVERSE.filter((u) => u.sector === instrument.sector && u.symbol !== instrument.symbol).slice(0, 5);
  const last = quote?.price ?? lastClose(instrument.symbol);
  const d1 = quote?.changePct ?? getReturn(instrument.symbol, 1);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Investment research"
        title="Security workbench"
        subtitle="Live snapshot from Yahoo Finance with EDGAR / exchange headlines on the Data feeds console."
      />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Ticker"
        className="max-w-xs font-mono uppercase"
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title={`${instrument.symbol} · ${instrument.name}`} className="xl:col-span-2">
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge variant="secondary">{instrument.assetClass}</Badge>
            <Badge variant="secondary">{instrument.sector}</Badge>
            <Badge variant="secondary">{instrument.region}</Badge>
            {quote ? <Badge className="bg-emerald-500/20 text-emerald-300">Live</Badge> : null}
          </div>
          <p className="mb-4 text-sm text-muted-foreground">{instrument.description}</p>
          <div className="h-[280px]">
            <Lines data={history} keys={[{ key: "px", color: "#d4af37", name: instrument.symbol }]} />
          </div>
        </Panel>
        <Panel title="Snapshot">
          <dl className="space-y-3 font-mono text-sm">
            <Row k="Last" v={last.toFixed(2)} />
            <Row k="1D" v={formatPct(d1)} />
            <Row k="1M" v={formatPct(getReturn(instrument.symbol, 21))} />
            <Row k="1Y" v={formatPct(getReturn(instrument.symbol, 252))} />
            <Row k="Beta mkt" v={instrument.betaMkt.toFixed(2)} />
            <Row k="Beta rates" v={instrument.betaRates.toFixed(2)} />
            <Row k="Model vol" v={`${(instrument.vol * 100).toFixed(1)}%`} />
            {instrument.pe ? <Row k="P/E" v={instrument.pe.toFixed(1)} /> : null}
            {instrument.yieldPct ? <Row k="Yield" v={`${instrument.yieldPct.toFixed(1)}%`} /> : null}
          </dl>
        </Panel>
      </div>
      <Panel title="Sector comparables">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-2">Symbol</th>
              <th>Name</th>
              <th className="text-right">Last</th>
              <th className="text-right">1Y</th>
            </tr>
          </thead>
          <tbody>
            {peers.map((p) => {
              const lq = live.get(p.symbol);
              return (
                <tr key={p.symbol} className="border-t border-border">
                  <td className="py-2 font-mono">{p.symbol}</td>
                  <td className="text-muted-foreground">{p.name}</td>
                  <td className="text-right font-mono">{(lq?.price ?? lastClose(p.symbol)).toFixed(2)}</td>
                  <td className="text-right font-mono">{formatPct(getReturn(p.symbol, 252))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
