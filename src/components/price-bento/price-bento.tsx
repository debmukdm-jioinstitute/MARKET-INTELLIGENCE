"use client";

/**
 * Price Bento — the approved Market intelligence price module.
 * Hero (daily close state) + chart + day range + previous close + takeaway.
 *
 * Presentational only: callers pass real market data. Direction/colour/words are derived in
 * `@/lib/price-bento/model` from the UNROUNDED daily change. Do NOT inline-derive them here.
 * Typography is the site's Google Sans (`font-sans` → next/font `--font-sans`).
 * Design spec + invariants: README "Price bento".
 */

import { ArrowDownRight, ArrowUpRight, Minus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  BENTO_TFS,
  chartHeading,
  dailyMove,
  fmtChange,
  fmtPctNum,
  fmtSessionLine,
  fmtStamp,
  fmtValue,
  heroWords,
  nearestIndex,
  plotDomain,
  rangeDirection,
  rangeMarker,
  takeaway,
  tfLong,
  type BentoDirection,
  type BentoTf,
  type BentoUnit,
  type SeriesPoint,
} from "@/lib/price-bento/model";
import { cn } from "@/lib/utils";

const INK = "#151515";
const IVORY = "#F6F5F1";
const CORAL = "#FF837C";
const MINT = "#B7F5A3";
const RED = "#C92F38";
const GREEN = "#26713D";

const TONE = {
  down: { hero: CORAL, accent: RED, chip: { bg: "#FFE3E0", fg: "#9E1F28" } },
  up: { hero: MINT, accent: GREEN, chip: { bg: GREEN, fg: "#FFFFFF" } },
  flat: { hero: IVORY, accent: "#5C5C57", chip: { bg: "#E9E7DF", fg: INK } },
} as const;

export type PriceBentoProps = {
  /** Normal-size instrument identification, e.g. "Nifty Bank" or "HDFC Bank". */
  name: string;
  unit: BentoUnit;
  tz: "Asia/Kolkata" | "America/New_York";
  session: "open" | "closed";
  close: number | null;
  prevClose: number | null;
  dayLow: number | null;
  dayHigh: number | null;
  asOf: string | number | null;
  /** Quote came from persisted last-good rather than a live source. */
  stale?: boolean;
  tf: BentoTf;
  onTfChange: (tf: BentoTf) => void;
  /** Ranges available for this instrument (default all four). */
  tfs?: readonly BentoTf[];
  series: SeriesPoint[];
  seriesLoading: boolean;
  seriesError: string | null;
  onRetrySeries: () => void;
  onRetryQuote?: () => void;
  /** Quote request still in flight — show a loading state, not "unavailable". */
  quoteLoading?: boolean;
  /** Mandatory provider credit, e.g. "Upstox". */
  source: string | null;
  sourceUrl?: string;
};

function useSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const r = e.contentRect;
      setSize((s) => (Math.round(s.w) === Math.round(r.width) && Math.round(s.h) === Math.round(r.height) ? s : { w: r.width, h: r.height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

const tile = "rounded-[22px] border-[1.5px] border-[#151515] sm:border-2";

export function PriceBento(props: PriceBentoProps) {
  const { name, unit, tz, session, close, prevClose, dayLow, dayHigh, asOf, stale, source, sourceUrl } = props;
  const tfs = props.tfs ?? BENTO_TFS;

  const move = useMemo(() => dailyMove(close, prevClose), [close, prevClose]);
  const dir: BentoDirection = move?.direction ?? "flat";
  const tone = TONE[dir];
  const [lead, verdict] = move ? heroWords(session, dir) : [session === "open" ? "Trading" : "Closed", "—"];
  const marker = rangeMarker(close, dayLow, dayHigh);
  const sessionLine = fmtSessionLine(asOf, session, tz);
  const Icon = dir === "down" ? ArrowDownRight : dir === "up" ? ArrowUpRight : Minus;
  const hasQuote = close != null && move != null;

  return (
    <section
      aria-label={`${name} price summary`}
      className="mx-auto w-full max-w-[1540px] rounded-[28px] p-3 font-sans text-[#151515] sm:p-5 min-[1100px]:p-8"
      style={{ background: IVORY }}
    >
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-[35fr_65fr] min-[1100px]:grid-cols-[30fr_70fr]">
        {/* 1. Hero */}
        <div
          className={cn(tile, "flex min-h-[340px] flex-col justify-between p-5 sm:p-7 min-[1100px]:min-h-[560px] min-[1100px]:p-8")}
          style={{ background: tone.hero, boxShadow: `4px 4px 0 ${INK}` }}
        >
          <div>
            <p className="text-xl font-semibold leading-tight sm:text-2xl">{name}</p>
            <h2 className="mt-4 text-[48px] font-bold leading-[1] tracking-[-0.02em] md:text-[clamp(44px,5vw,64px)] min-[1100px]:text-[clamp(56px,5.6vw,88px)]">
              {lead}
              <br />
              {verdict}
            </h2>
          </div>

          <div className="mt-6 space-y-3">
            {hasQuote ? (
              <>
                <p className="text-[clamp(40px,4.6vw,72px)] font-bold leading-[1.08] tabular-nums break-words">{fmtValue(close, unit)}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[clamp(20px,2.2vw,32px)] font-bold leading-none tabular-nums"
                    style={{ background: tone.chip.bg, color: tone.chip.fg }}
                  >
                    <Icon aria-hidden className="size-[1em]" strokeWidth={2.75} />
                    {fmtPctNum(move.changePct, dir)}
                  </span>
                  <span className="text-[clamp(18px,1.9vw,28px)] font-semibold tabular-nums">{fmtChange(move.change, unit)}</span>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-2xl font-bold">{props.quoteLoading ? "Loading quote…" : "Quote unavailable right now."}</p>
                {props.onRetryQuote && !props.quoteLoading ? (
                  <button
                    type="button"
                    onClick={props.onRetryQuote}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-full border-2 border-[#151515] bg-white px-4 text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#151515] focus-visible:ring-offset-2"
                  >
                    <RefreshCw className="size-4" aria-hidden /> Retry
                  </button>
                ) : null}
              </div>
            )}
            <hr className="border-0 border-t border-[#151515]/25" />
            <p className="text-base font-medium leading-snug sm:text-lg">
              {sessionLine ?? (props.quoteLoading ? "Fetching latest quote…" : "Timestamp unavailable")}
              {stale ? " · delayed" : ""}
            </p>
          </div>
        </div>

        {/* 2. Chart */}
        <ChartTile {...props} tfs={tfs} dir={dir} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:mt-4 sm:grid-cols-2 sm:gap-4 min-[1100px]:grid-cols-[36fr_27fr_37fr]">
        {/* 3. Range */}
        <div className={cn(tile, "flex min-h-[190px] flex-col justify-between bg-white sm:col-span-2 p-5 sm:p-7 min-[1100px]:col-span-1 min-[1100px]:min-h-[210px] min-[1100px]:p-8")}>
          <h3 className="sr-only">Day range</h3>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-medium sm:text-lg">Low</p>
              <p className="text-2xl font-bold tabular-nums sm:text-3xl">{fmtValue(dayLow, unit)}</p>
            </div>
            <div className="text-right">
              <p className="text-base font-medium sm:text-lg">High</p>
              <p className="text-2xl font-bold tabular-nums sm:text-3xl">{fmtValue(dayHigh, unit)}</p>
            </div>
          </div>
          <div
            role="img"
            aria-label={marker == null ? "Day range unavailable" : `Current value is ${Math.round(marker * 100)}% of the way from the day low to the day high`}
            className="relative mt-6 h-3 w-full rounded-full bg-[#E4E2DA]"
          >
            {marker != null ? (
              <>
                <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${marker * 100}%`, background: tone.accent }} />
                <div
                  className="absolute top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white"
                  style={{ left: `${marker * 100}%`, background: tone.accent, boxShadow: `0 0 0 1.5px ${INK}` }}
                />
              </>
            ) : null}
          </div>
        </div>

        {/* 4. Previous close */}
        <div className={cn(tile, "flex min-h-[190px] flex-col justify-between bg-[#151515] p-5 text-white sm:p-7 min-[1100px]:min-h-[210px] min-[1100px]:p-8")}>
          <h3 className="sr-only">Previous close</h3>
          <p className="text-[clamp(30px,3.6vw,56px)] font-bold leading-[1.08] tabular-nums break-words">{fmtValue(prevClose, unit)}</p>
          <div>
            <hr className="mb-3 border-0 border-t border-white/25" />
            <p className="text-base font-medium text-white/85 sm:text-lg">Previous close — your comparison point.</p>
          </div>
        </div>

        {/* 5. Takeaway */}
        <div className={cn(tile, "relative flex min-h-[190px] flex-col justify-end bg-white p-5 sm:p-7 min-[1100px]:min-h-[210px] min-[1100px]:p-8")}>
          <h3 className="sr-only">Takeaway</h3>
          <span
            aria-hidden
            className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full sm:right-6 sm:top-6"
            style={{ background: tone.chip.bg === GREEN ? "#DDF7D2" : tone.chip.bg, color: tone.accent }}
          >
            <Icon className="size-6" strokeWidth={2.75} />
          </span>
          <p className="max-w-[16ch] text-[22px] font-bold leading-[1.15] sm:text-[clamp(24px,2.4vw,36px)]">{takeaway(move)}</p>
        </div>
      </div>

      {source ? (
        <p className="mt-3 text-sm font-medium text-[#151515]/70 sm:mt-4 sm:text-base">
          Data:{" "}
          {sourceUrl ? (
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              {source}
            </a>
          ) : (
            source
          )}
        </p>
      ) : null}
    </section>
  );
}

function ChartTile(props: PriceBentoProps & { tfs: readonly BentoTf[]; dir: BentoDirection }) {
  const { tf, onTfChange, tfs, series, seriesLoading, seriesError, onRetrySeries, unit, tz, prevClose, dir: dailyDir } = props;
  const [wrapRef, size] = useSize<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const uid = useId().replace(/:/g, "");

  // Chart direction: daily direction for 1D (matches the hero); the range's own first→last otherwise.
  const rDir = tf === "1D" ? dailyDir : rangeDirection(series);
  const accent = TONE[rDir].accent;
  const baseline = tf === "1D" && prevClose != null ? prevClose : null;

  const M = { l: 8, r: 16, t: 20, b: 30 };
  const W = Math.max(0, size.w);
  const H = Math.max(0, size.h);
  const pw = Math.max(1, W - M.l - M.r);
  const ph = Math.max(1, H - M.t - M.b);
  const domain = useMemo(() => plotDomain(series, baseline), [series, baseline]);

  const pts = useMemo(() => {
    if (!domain || W < 20 || H < 20) return [];
    const n = series.length;
    return series.map((p, i) => ({
      x: M.l + (n > 1 ? (i / (n - 1)) * pw : pw / 2),
      y: M.t + (1 - (p.v - domain.min) / (domain.max - domain.min)) * ph,
      p,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, domain, W, H]);

  const line = pts.map((c, i) => `${i ? "L" : "M"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const area = pts.length ? `${line} L${pts[pts.length - 1].x.toFixed(1)},${M.t + ph} L${pts[0].x.toFixed(1)},${M.t + ph} Z` : "";
  const last = pts[pts.length - 1];
  const baseY = domain && baseline != null ? M.t + (1 - (baseline - domain.min) / (domain.max - domain.min)) * ph : null;

  // Put the previous-close label on the side where the trace is farthest from the baseline.
  const labelSide: "left" | "right" = useMemo(() => {
    if (baseY == null || pts.length < 4) return "left";
    const q = Math.max(1, Math.floor(pts.length / 4));
    const avg = (a: typeof pts) => a.reduce((s, c) => s + (c.y - baseY), 0) / a.length;
    const l = avg(pts.slice(0, q));
    const r = avg(pts.slice(-q));
    return Math.abs(l) >= Math.abs(r) ? "left" : "right";
  }, [pts, baseY]);
  const labelBelow = useMemo(() => {
    if (baseY == null || !pts.length) return false;
    const q = Math.max(1, Math.floor(pts.length / 4));
    const seg = labelSide === "left" ? pts.slice(0, q) : pts.slice(-q);
    return seg.reduce((s, c) => s + (c.y - baseY), 0) / seg.length < 0; // trace above baseline → label below line
  }, [pts, baseY, labelSide]);

  const ticks = useMemo(() => {
    if (pts.length < 2) return [];
    const count = W < 520 ? 3 : 5;
    return Array.from({ length: count }, (_, k) => {
      const i = Math.round((k / (count - 1)) * (pts.length - 1));
      return { x: pts[i].x, label: fmtStamp(pts[i].p.t, tz, tf), anchor: k === 0 ? "start" : k === count - 1 ? "end" : "middle" } as const;
    });
  }, [pts, W, tz, tf]);

  const onMove = useCallback(
    (clientX: number, rect: DOMRect) => {
      if (!pts.length) return;
      const frac = (clientX - rect.left - M.l) / pw;
      setActive(nearestIndex(pts.length, frac));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pts.length, pw],
  );

  useEffect(() => setActive(null), [tf, series]);

  const sel = active != null ? pts[active] : null;
  const rangePct = series.length > 1 && series[0].v !== 0 ? ((series[series.length - 1].v - series[0].v) / series[0].v) * 100 : null;
  const desc =
    tf === "1D"
      ? `Intraday price, ${series.length} points${baseline != null ? `, compared with the previous close` : ""}.`
      : `${tfLong(tf)} price, ${series.length} points. Over this period the price is ${rDir === "flat" ? "unchanged" : rDir === "up" ? "up" : "down"}${rangePct != null ? ` ${fmtPctNum(rangePct, rDir)}` : ""}. This is not the daily change.`;

  const tipLeft = sel ? Math.min(Math.max(sel.x, 70), Math.max(70, W - 70)) : 0;

  return (
    <div className={cn(tile, "flex min-h-[420px] flex-col bg-white p-5 sm:p-7 min-[1100px]:min-h-[560px] min-[1100px]:p-8")}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <h2 className="text-[26px] font-bold leading-[1.05] sm:text-[clamp(28px,2.6vw,40px)]">{chartHeading(tf)}</h2>
        <div role="group" aria-label="Time range" className="inline-flex rounded-full border border-[#151515]/20 bg-[#F6F5F1] p-1">
          {tfs.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={t === tf}
              onClick={() => onTfChange(t)}
              className={cn(
                "min-h-[40px] min-w-[48px] rounded-full px-3.5 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#151515] focus-visible:ring-offset-1",
                t === tf ? "bg-[#151515] text-white" : "text-[#3A3A36] hover:text-[#151515]",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={wrapRef}
        tabIndex={pts.length ? 0 : -1}
        role="group"
        aria-label={`${chartHeading(tf)} ${desc}`}
        onKeyDown={(e) => {
          if (!pts.length) return;
          if (e.key === "ArrowRight") setActive((a) => Math.min(pts.length - 1, (a ?? pts.length - 1) + (a == null ? 0 : 1)));
          else if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? pts.length - 1) - 1));
          else if (e.key === "Escape") setActive(null);
          else return;
          e.preventDefault();
        }}
        className="relative mt-4 min-h-[240px] w-full flex-1 touch-pan-y rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#151515]/50"
      >
        {seriesLoading && !pts.length ? (
          <div className="absolute inset-0 flex animate-pulse items-center justify-center rounded-lg bg-[#F6F5F1] text-base font-medium text-[#151515]/70 motion-reduce:animate-none">
            Loading {tf} prices…
          </div>
        ) : seriesError || !series.length ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-[#F6F5F1] p-4 text-center">
            <p className="text-lg font-semibold">{seriesError ? "Price history couldn’t load." : `No ${tf} price history available right now.`}</p>
            <button
              type="button"
              onClick={onRetrySeries}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border-2 border-[#151515] bg-white px-4 text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#151515] focus-visible:ring-offset-2"
            >
              <RefreshCw className="size-4" aria-hidden /> Retry
            </button>
          </div>
        ) : W > 0 ? (
          <>
            <svg
              width={W}
              height={H}
              className="absolute inset-0 select-none"
              style={{ fontFamily: "inherit" }}
              onPointerMove={(e) => onMove(e.clientX, e.currentTarget.getBoundingClientRect())}
              onPointerDown={(e) => onMove(e.clientX, e.currentTarget.getBoundingClientRect())}
              onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
            >
              <defs>
                <linearGradient id={`${uid}-a`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity="0.10" />
                  <stop offset="100%" stopColor={accent} stopOpacity="0.01" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75].map((f) => (
                <line key={f} x1={M.l} x2={W - M.r} y1={M.t + ph * f} y2={M.t + ph * f} stroke={INK} strokeOpacity="0.08" />
              ))}
              {baseY != null ? <line x1={M.l} x2={W - M.r} y1={baseY} y2={baseY} stroke="#8C8C86" strokeWidth="1.5" strokeDasharray="6 6" /> : null}
              <path d={area} fill={`url(#${uid}-a)`} />
              <path d={line} fill="none" stroke={accent} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
              {ticks.map((t, i) => (
                <text key={i} x={t.x} y={H - 8} textAnchor={t.anchor} fontSize="14" fontWeight="500" fill={INK} fillOpacity="0.65">
                  {t.label}
                </text>
              ))}
              {sel ? <line x1={sel.x} x2={sel.x} y1={M.t} y2={M.t + ph} stroke={INK} strokeOpacity="0.35" strokeWidth="1.5" /> : null}
              {last ? <circle cx={last.x} cy={last.y} r="6" fill={accent} stroke="#fff" strokeWidth="2.5" /> : null}
              {sel ? <circle cx={sel.x} cy={sel.y} r="5.5" fill="#fff" stroke={accent} strokeWidth="2.5" /> : null}
            </svg>

            {baseY != null && prevClose != null ? (
              <span
                className="pointer-events-none absolute rounded bg-white/90 px-1.5 text-sm font-medium text-[#151515]/75"
                style={{
                  [labelSide]: labelSide === "left" ? M.l + 4 : M.r + 4,
                  top: labelBelow ? baseY + 4 : baseY - 24,
                  maxWidth: "70%",
                }}
              >
                Previous close · {fmtValue(prevClose, unit)}
              </span>
            ) : null}

            {sel ? (
              <div
                role="status"
                className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-xl border-2 border-[#151515] bg-white px-3 py-1.5 text-sm font-semibold shadow-[2px_2px_0_#151515]"
                style={{ left: tipLeft, top: Math.max(0, sel.y - 62) }}
              >
                <span className="block font-medium text-[#151515]/70">
                  {fmtStamp(sel.p.t, tz, tf)}
                  {tf === "1D" ? ` ${tz === "Asia/Kolkata" ? "IST" : "ET"}` : ""}
                </span>
                <span className="tabular-nums">{fmtValue(sel.p.v, unit)}</span>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <p className="mt-3 text-base font-medium text-[#151515]/70">
        {tf === "1D"
          ? `${series.length} intraday points`
          : rangePct != null
            ? `${tfLong(tf).replace(/^./, (c) => c.toUpperCase())}: ${fmtPctNum(rangePct, rDir)}`
            : ""}
      </p>
    </div>
  );
}
