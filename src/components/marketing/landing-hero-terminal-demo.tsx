"use client";

import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

type DemoView = "market" | "vix" | "flows";

const CHART_PATHS: Record<DemoView, string> = {
  market:
    "M 0 72 C 40 68, 60 78, 90 58 C 120 42, 140 48, 170 38 C 200 28, 220 34, 250 22 C 280 14, 310 26, 340 18 C 370 10, 390 16, 400 8",
  vix:
    "M 0 55 C 50 52, 80 60, 120 48 C 160 36, 190 44, 230 30 C 270 22, 300 38, 340 28 C 360 24, 380 32, 400 26",
  flows:
    "M 0 65 C 45 62, 70 70, 110 55 C 150 40, 180 52, 220 45 C 260 38, 290 48, 330 35 C 360 28, 385 42, 400 30",
};

function istFetchedLabel(now: Date): string {
  return now.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function LandingHeroTerminalDemo() {
  const [view, setView] = useState<DemoView>("market");
  const [now, setNow] = useState(() => new Date());
  const [pulse, setPulse] = useState({
    index: 24836.3,
    indexPct: 0.42,
    vix: 12.84,
    fiiLabel: "Mixed" as "Mixed" | "Net buy" | "Net sell",
  });

  useEffect(() => {
    const tick = setInterval(() => {
      setNow(new Date());
      setPulse((p) => ({
        index: Math.round((p.index + (Math.random() * 8 - 4)) * 100) / 100,
        indexPct: Math.round((p.indexPct + (Math.random() * 0.06 - 0.03)) * 100) / 100,
        vix: Math.round((p.vix + (Math.random() * 0.12 - 0.06)) * 100) / 100,
        fiiLabel:
          Math.random() > 0.92
            ? p.fiiLabel === "Mixed"
              ? "Net buy"
              : p.fiiLabel === "Net buy"
                ? "Net sell"
                : "Mixed"
            : p.fiiLabel,
      }));
    }, 1200);
    return () => clearInterval(tick);
  }, []);

  const title =
    view === "market" ? "NIFTY 50 / MARKET VIEW" : view === "vix" ? "INDIA VIX / VOL VIEW" : "FII · DII / FLOWS VIEW";

  const vixMood = pulse.vix < 14 ? "Calm" : pulse.vix < 18 ? "Elevated" : "Hot";

  const chartPath = useMemo(() => CHART_PATHS[view], [view]);

  return (
    <div className="landing-terminal-demo relative w-full max-w-xl lg:max-w-none lg:justify-self-end">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#121212] shadow-[0_40px_100px_-30px_rgba(0,0,0,0.85)]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
          </div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/70">{title}</p>
          <span className="rounded border border-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/50">
            Demo
          </span>
        </div>

        <div className="grid grid-cols-3 gap-px bg-white/10">
          <button
            type="button"
            onClick={() => setView("market")}
            className={cn(
              "bg-[#121212] px-3 py-4 text-left transition hover:bg-white/[0.04]",
              view === "market" && "ring-1 ring-inset ring-[#e8845c]/50",
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Index</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-white">{pulse.index.toLocaleString("en-IN")}</p>
            <p className={cn("mt-0.5 text-xs tabular-nums", pulse.indexPct >= 0 ? "text-emerald-400" : "text-rose-400")}>
              {pulse.indexPct >= 0 ? "+" : ""}
              {pulse.indexPct.toFixed(2)}% today
            </p>
          </button>
          <button
            type="button"
            onClick={() => setView("vix")}
            className={cn(
              "bg-[#121212] px-3 py-4 text-left transition hover:bg-white/[0.04]",
              view === "vix" && "ring-1 ring-inset ring-[#e8845c]/50",
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">India VIX</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-white">{pulse.vix.toFixed(2)}</p>
            <p className="mt-0.5 text-xs text-white/55">{vixMood}</p>
          </button>
          <button
            type="button"
            onClick={() => setView("flows")}
            className={cn(
              "bg-[#121212] px-3 py-4 text-left transition hover:bg-white/[0.04]",
              view === "flows" && "ring-1 ring-inset ring-[#e8845c]/50",
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">FII / DII</p>
            <p className="mt-1 text-lg font-semibold text-white">{pulse.fiiLabel}</p>
            <p className="mt-0.5 text-xs text-white/55">Cash market</p>
          </button>
        </div>

        <div className="relative h-44 border-t border-white/10 bg-[#0c0c0c] sm:h-52">
          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 400 80">
            {[20, 40, 60].map((y) => (
              <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            ))}
            <path d={`${chartPath} L 400 80 L 0 80 Z`} fill="rgba(232,132,92,0.12)" />
            <path
              d={chartPath}
              fill="none"
              stroke="#e8845c"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="absolute bottom-3 left-4 text-[10px] text-white/40">Source: NSE · sample interface</p>
          <p className="absolute bottom-3 right-4 text-[10px] tabular-nums text-white/40">Fetched {istFetchedLabel(now)} IST</p>
        </div>
      </div>
    </div>
  );
}
