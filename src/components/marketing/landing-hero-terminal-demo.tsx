"use client";

import { useIndiaDashboard } from "@/hooks/use-india-dashboard";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

type View = "market" | "vix" | "flows";

const fmtLabel = (iso: string | undefined) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })
    : "—";

/** Real series to an SVG path in a 400x80 box. Returns null when there are fewer than 2 points. */
function toPath(values: number[]): string | null {
  const v = values.filter((x) => Number.isFinite(x));
  if (v.length < 2) return null;
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  const span = hi - lo || 1;
  return v.map((y, i) => `${i ? "L" : "M"} ${((i / (v.length - 1)) * 400).toFixed(1)} ${(74 - ((y - lo) / span) * 66).toFixed(1)}`).join(" ");
}

/** Hero panel driven entirely by the live India dashboard feed. No simulated ticks, no placeholder paths. */
export function LandingHeroTerminalDemo() {
  const [view, setView] = useState<View>("market");
  const { data } = useIndiaDashboard(60_000);

  const nifty = data?.pulse?.nifty;
  const vix = data?.pulse?.indiaVix;
  const fii = data?.moneyFlow?.fii;
  const dii = data?.moneyFlow?.dii;

  const series = useMemo(() => {
    if (view === "market") return (data?.indiaMoving?.nifty?.history1m ?? []).map((p) => p.value);
    if (view === "vix") return (data?.indiaMoving?.indiaVix?.history1m ?? []).map((p) => p.value);
    return (fii?.history ?? []).map((p) => p.value);
  }, [view, data, fii?.history]);
  const path = toPath(series);

  const title = view === "market" ? "NIFTY 50 / 1 MONTH" : view === "vix" ? "INDIA VIX / 1 MONTH" : "FII NET FLOW / RECENT SESSIONS";
  const vixValue = vix?.value ?? null;
  const vixMood = vixValue == null ? "—" : vixValue < 14 ? "Calm" : vixValue < 18 ? "Elevated" : "Hot";
  const fiiToday = fii?.today ?? null;
  const flowLabel = fiiToday == null ? "—" : fiiToday > 0 ? "Net buy" : fiiToday < 0 ? "Net sell" : "Flat";
  const pct = nifty?.changePct ?? null;

  const tab = (id: View) => cn("bg-white/95 px-3 py-4 text-left transition hover:bg-gray-50", view === id && "ring-1 ring-inset ring-[#e8845c]/55");

  return (
    <div className="landing-terminal-demo relative w-full max-w-xl lg:max-w-none lg:justify-self-end">
      <div className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white/80 shadow-[0_30px_80px_-24px_rgba(30,58,138,0.28)] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-gray-200/80 bg-white/90 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
          </div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-600">{title}</p>
          <span className="rounded border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Live</span>
        </div>

        <div className="grid grid-cols-3 gap-px bg-gray-200/80">
          <button type="button" onClick={() => setView("market")} className={tab("market")}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Nifty 50</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900">{nifty?.value != null ? nifty.value.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"}</p>
            <p className={cn("mt-0.5 text-xs tabular-nums", pct == null ? "text-gray-500" : pct >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {pct == null ? "—" : `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}% today`}
            </p>
          </button>
          <button type="button" onClick={() => setView("vix")} className={tab("vix")}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">India VIX</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900">{vixValue != null ? vixValue.toFixed(2) : "—"}</p>
            <p className="mt-0.5 text-xs text-gray-600">{vixMood}</p>
          </button>
          <button type="button" onClick={() => setView("flows")} className={tab("flows")}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">FII / DII</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{flowLabel}</p>
            <p className="mt-0.5 text-xs tabular-nums text-gray-600">
              {fiiToday != null ? `FII ₹${fiiToday.toLocaleString("en-IN")} Cr` : "Cash market"}
              {dii?.today != null ? ` · DII ₹${dii.today.toLocaleString("en-IN")} Cr` : ""}
            </p>
          </button>
        </div>

        <div className="relative h-44 border-t border-gray-200/80 bg-gray-50/90 sm:h-52">
          {path ? (
            <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 400 80">
              {[20, 40, 60].map((y) => (
                <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="rgba(15,23,42,0.07)" strokeWidth="1" />
              ))}
              <path d={`${path} L 400 80 L 0 80 Z`} fill="rgba(232,132,92,0.15)" />
              <path d={path} fill="none" stroke="#e8845c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <p className="absolute inset-0 flex items-center justify-center text-xs text-gray-500">{data ? "No history available for this series" : "Loading live data…"}</p>
          )}
          <p className="absolute bottom-3 left-4 text-[10px] text-gray-500">Source: NSE</p>
          <p className="absolute bottom-3 right-4 text-[10px] tabular-nums text-gray-500">Fetched {fmtLabel(data?.fetchedAt)} IST</p>
        </div>
      </div>
    </div>
  );
}
