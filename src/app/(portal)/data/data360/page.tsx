"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(`Empty API response (HTTP ${res.status}). Try refresh or sign in again.`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Bad API response (HTTP ${res.status}). Not JSON.`);
  }
}

type StatusPayload = {
  ok: boolean;
  status?: {
    refAreas: string[];
    datasets: number;
    indicators: number;
    indicatorsComplete: number;
    indicatorsPending: number;
    observations: number;
    refCursorsComplete: number;
    refCursors: number;
  };
};

type DatasetRow = {
  database_id: string;
  series_count: number;
  indicators_cataloged: number;
  last_catalog_at: string | null;
};

type IndicatorRow = {
  indicator_id: string;
  complete: boolean;
  obs_stored: number;
  last_synced_at: string | null;
};

type ObsRow = {
  ref_area: string;
  time_period: string;
  obs_value: number | null;
  unit_measure: string | null;
  freq: string | null;
};

const PRESETS: { database: string; indicator: string; label: string }[] = [
  { database: "WB_WDI", indicator: "WB_WDI_NY_GDP_MKTP_KD_ZG", label: "India real GDP growth" },
  { database: "WB_WDI", indicator: "WB_WDI_FP_CPI_TOTL_ZG", label: "India CPI inflation" },
  { database: "WB_WDI", indicator: "WB_WDI_NY_GDP_MKTP_KD_ZG", label: "USA real GDP growth" },
];

function Data360ExplorerInner() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<StatusPayload["status"] | null>(null);
  const [refAreas, setRefAreas] = useState<string[]>(["IND", "USA"]);
  const [datasets, setDatasets] = useState<DatasetRow[]>([]);
  const [database, setDatabase] = useState("WB_WDI");
  const [q, setQ] = useState("");
  const [indicators, setIndicators] = useState<IndicatorRow[]>([]);
  const [indTotal, setIndTotal] = useState(0);
  const [selected, setSelected] = useState<{ database: string; indicator: string } | null>(null);
  const [refArea, setRefArea] = useState("IND");
  const [obs, setObs] = useState<ObsRow[]>([]);
  const [seriesSource, setSeriesSource] = useState<"mirror" | "live" | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/data360");
    const j = await readJson<StatusPayload & { error?: string }>(res);
    if (!res.ok || j.error) throw new Error(j.error ?? "status failed");
    setStatus(j.status ?? null);
    if (j.status?.refAreas?.length) setRefAreas(j.status.refAreas);
  }, []);

  const loadDatasets = useCallback(async () => {
    const res = await fetch("/api/data360?list=datasets");
    const j = await readJson<{ datasets?: DatasetRow[]; refAreas?: string[]; error?: string }>(res);
    if (!res.ok) throw new Error(j.error ?? "datasets failed");
    setDatasets(j.datasets ?? []);
    if (j.refAreas?.length) setRefAreas(j.refAreas);
  }, []);

  const loadIndicators = useCallback(async () => {
    const sp = new URLSearchParams({ list: "indicators", database, limit: "80" });
    if (q.trim()) sp.set("q", q.trim());
    const res = await fetch(`/api/data360?${sp}`);
    const j = await readJson<{ indicators?: IndicatorRow[]; total?: number; error?: string }>(res);
    if (!res.ok) throw new Error(j.error ?? "indicators failed");
    setIndicators(j.indicators ?? []);
    setIndTotal(j.total ?? 0);
  }, [database, q]);

  const loadSeries = useCallback(async () => {
    if (!selected) return;
    const sp = new URLSearchParams({
      database: selected.database,
      indicator: selected.indicator,
      ref_area: refArea,
      limit: "120",
    });
    const res = await fetch(`/api/data360?${sp}`);
    const j = await readJson<{ rows?: ObsRow[]; source?: "mirror" | "live"; error?: string }>(res);
    if (!res.ok) throw new Error(j.error ?? "series failed");
    setObs(j.rows ?? []);
    setSeriesSource(j.source ?? null);
  }, [selected, refArea]);

  useEffect(() => {
    setLoading(true);
    setErr("");
    Promise.all([loadStatus(), loadDatasets()])
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [loadStatus, loadDatasets]);

  useEffect(() => {
    const db = searchParams.get("database");
    const ind = searchParams.get("indicator");
    const ref = searchParams.get("ref_area")?.toUpperCase();
    if (db) setDatabase(db);
    if (ind) setSelected({ database: db ?? "WB_WDI", indicator: ind });
    if (ref === "IND" || ref === "USA") setRefArea(ref);
  }, [searchParams]);

  useEffect(() => {
    loadIndicators().catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, [loadIndicators]);

  useEffect(() => {
    if (selected) loadSeries().catch((e) => setErr(e instanceof Error ? e.message : String(e)));
    else setObs([]);
  }, [selected, refArea, loadSeries]);

  const progressPct = useMemo(() => {
    if (!status?.refCursors) return 0;
    return Math.round((100 * (status.refCursorsComplete ?? 0)) / status.refCursors);
  }, [status]);

  return (
    <div className="portal-page pb-10">
      <PageHeader
        kicker="Data Centre"
        title="World Bank Data360 Explorer"
        subtitle="Browse mirrored macro series for India (IND) and United States (USA). Synced nightly from data360api.worldbank.org into our database."
      />

      <p className="text-sm text-muted-foreground">
        API docs:{" "}
        <a
          href="https://data360.worldbank.org/en/api"
          className="text-blue-600 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          World Bank Data360
        </a>
        {" · "}
        <Link href="/data/feeds" className="text-blue-600 hover:underline">
          Feed health
        </Link>
      </p>

      {err ? <p className="text-sm text-rose-600">{err}</p> : null}
      {loading && !status ? <p className="text-sm text-muted-foreground">Loading mirror status…</p> : null}

      {status ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase text-muted-foreground">Observations stored</p>
            <p className="text-2xl font-bold tabular-nums">{status.observations.toLocaleString()}</p>
            <p className="text-muted-foreground">{status.refAreas.join(" · ")}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase text-muted-foreground">Indicators</p>
            <p className="text-2xl font-bold tabular-nums">{status.indicators.toLocaleString()}</p>
            <p className="text-muted-foreground">{status.indicatorsComplete} complete</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase text-muted-foreground">Country sync progress</p>
            <p className="text-2xl font-bold tabular-nums">{progressPct}%</p>
            <p className="text-muted-foreground">
              {status.refCursorsComplete} / {status.refCursors} cursors
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase text-muted-foreground">Databases</p>
            <p className="text-2xl font-bold tabular-nums">{status.datasets}</p>
            <p className="text-muted-foreground">{status.indicatorsPending} indicators pending</p>
          </div>
        </div>
      ) : null}

      <Panel title="Quick open" subtitle="Common WDI series — pick ref area after load.">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={`${p.indicator}-${p.label}`}
              type="button"
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-accent"
              onClick={() => {
                setDatabase(p.database);
                setSelected({ database: p.database, indicator: p.indicator });
                if (p.label.includes("USA")) setRefArea("USA");
                else setRefArea("IND");
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-5">
        <Panel title="Indicators" subtitle={`${indTotal.toLocaleString()} in ${database}`} className="lg:col-span-2">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <select
              value={database}
              onChange={(e) => {
                setDatabase(e.target.value);
                setSelected(null);
              }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {datasets.map((d) => (
                <option key={d.database_id} value={d.database_id}>
                  {d.database_id} ({d.indicators_cataloged || "—"} ids)
                </option>
              ))}
              {!datasets.length ? <option value="WB_WDI">WB_WDI</option> : null}
            </select>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter id… e.g. GDP, CPI"
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="max-h-[420px] overflow-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Indicator</TableHead>
                  <TableHead className="text-right">Rows</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {indicators.map((i) => (
                  <TableRow
                    key={i.indicator_id}
                    className={cn(
                      "cursor-pointer",
                      selected?.indicator === i.indicator_id ? "bg-blue-600/10" : "",
                    )}
                    onClick={() => setSelected({ database, indicator: i.indicator_id })}
                  >
                    <TableCell className="text-xs font-medium">{i.indicator_id}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{i.obs_stored ?? 0}</TableCell>
                  </TableRow>
                ))}
                {!indicators.length ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-sm text-muted-foreground">
                      No indicators cataloged yet. Admin must run Data360 catalog cron.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </Panel>

        <Panel
          title="Time series"
          subtitle={selected ? selected.indicator : "Select an indicator"}
          className="lg:col-span-3"
        >
          {selected ? (
            <>
              {seriesSource === "live" ? (
                <p className="mb-2 text-xs text-amber-700 bg-amber-500/10 rounded-md px-2 py-1">
                  Mirror empty — showing live World Bank Data360 for this series. Nightly cron fills local copy.
                </p>
              ) : null}
              <div className="mb-3 flex flex-wrap gap-2">
                {refAreas.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setRefArea(a)}
                    className={cn(
                      "rounded-lg px-3 py-1 text-sm font-semibold",
                      refArea === a ? "bg-blue-600 text-white" : "border border-border bg-card hover:bg-accent",
                    )}
                  >
                    {a === "IND" ? "India" : a === "USA" ? "United States" : a}
                  </button>
                ))}
              </div>
              <div className="max-h-[420px] overflow-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead>Unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {obs.map((r) => (
                      <TableRow key={`${r.ref_area}-${r.time_period}`}>
                        <TableCell className="tabular-nums">{r.time_period}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {r.obs_value != null ? r.obs_value : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.unit_measure ?? r.freq ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                    {!obs.length ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-sm text-muted-foreground">
                          No rows stored for this indicator and country yet — sync may still be running.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Choose an indicator from the list to view stored observations.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

export default function Data360ExplorerPage() {
  return (
    <Suspense fallback={<div className="portal-page p-10 text-sm text-muted-foreground">Loading Data360…</div>}>
      <Data360ExplorerInner />
    </Suspense>
  );
}
