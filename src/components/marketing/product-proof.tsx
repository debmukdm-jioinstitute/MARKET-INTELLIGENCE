"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useCallback, useId, useMemo, useState } from "react";

/** Illustrative, hand-made series (normalised). Not market data — labelled as such in the UI. */
const SAMPLES = [
  {
    id: "RELIANCE",
    name: "Reliance Industries",
    series: [42, 45, 44, 48, 52, 50, 55, 58, 56, 61, 64, 63, 68],
    brief: [
      { text: "Momentum is above its 50-day average and volume is rising into the move.", cite: "NSE India · daily prices" },
      { text: "Valuation sits near the middle of its own multi-year range.", cite: "Company filings · exchange disclosures" },
      { text: "Watch crude and the rupee: both feed into refining margins.", cite: "RBI · FRED macro series" },
    ],
  },
  {
    id: "HDFCBANK",
    name: "HDFC Bank",
    series: [60, 58, 59, 55, 54, 56, 53, 55, 57, 56, 59, 61, 60],
    brief: [
      { text: "Price has been range-bound; no confirmed breakout on the daily chart.", cite: "NSE India · daily prices" },
      { text: "Sector breadth is mixed, so bank moves are stock-specific right now.", cite: "NSE India · sector indices" },
      { text: "Rate expectations matter most for net interest margin.", cite: "RBI · policy statements" },
    ],
  },
  {
    id: "TCS",
    name: "Tata Consultancy Services",
    series: [50, 52, 55, 54, 57, 59, 58, 60, 62, 61, 63, 62, 65],
    brief: [
      { text: "Steady uptrend with shallow pullbacks; relative strength is above the index.", cite: "NSE India · daily prices" },
      { text: "US demand and the dollar-rupee rate drive revenue outlook.", cite: "FRED · RBI reference rates" },
      { text: "Results dates can move the stock sharply; check the earnings calendar.", cite: "Exchange filings" },
    ],
  },
] as const;

type Sample = (typeof SAMPLES)[number];

function getChartPoints(series: readonly number[]): { x: number; y: number; v: number }[] {
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  return series.map((v, i) => ({
    x: (i / (series.length - 1)) * 100,
    y: 100 - ((v - min) / span) * 90 - 5,
    v,
  }));
}

function buildLinePath(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

function buildAreaPath(points: { x: number; y: number }[]): string {
  if (!points.length) return "";
  return `${buildLinePath(points)} L 100 100 L 0 100 Z`;
}

function IllustrativeChart({
  sample,
  reduceMotion,
}: {
  sample: Sample;
  reduceMotion: boolean;
}) {
  const gradId = useId().replace(/:/g, "");
  const points = useMemo(() => getChartPoints(sample.series), [sample.series]);
  const linePath = useMemo(() => buildLinePath(points), [points]);
  const areaPath = useMemo(() => buildAreaPath(points), [points]);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const onMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      let best = 0;
      let bestDist = Infinity;
      points.forEach((p, i) => {
        const d = Math.abs(p.x - x);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      setHoverIdx(best);
    },
    [points],
  );

  const active = hoverIdx != null ? points[hoverIdx] : points[points.length - 1];

  return (
    <div className="relative mt-3">
      <motion.svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-48 w-full cursor-crosshair rounded-xl bg-gradient-to-b from-blue-50/80 to-white/40 ring-1 ring-blue-100/80"
        role="img"
        aria-label={`Illustrative price trend for ${sample.name}`}
        onMouseMove={onMove}
        onMouseLeave={() => setHoverIdx(null)}
        initial={reduceMotion ? false : { opacity: 0.6 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <motion.path
          d={areaPath}
          fill={`url(#${gradId})`}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        />
        <motion.path
          key={sample.id + linePath}
          d={linePath}
          fill="none"
          stroke="#2563eb"
          strokeWidth="1.8"
          vectorEffect="non-scaling-stroke"
          initial={reduceMotion ? false : { pathLength: 0, opacity: 0.5 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        />
        {points.map((p, i) => (
          <motion.circle
            key={`${sample.id}-dot-${i}`}
            cx={p.x}
            cy={p.y}
            r={hoverIdx === i ? 2.2 : 0}
            fill="#1d4ed8"
            initial={false}
            animate={{ r: hoverIdx === i ? 2.2 : 0, opacity: hoverIdx === i ? 1 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
          />
        ))}
        {active ? (
          <motion.line
            x1={active.x}
            x2={active.x}
            y1={5}
            y2={100}
            stroke="#93c5fd"
            strokeWidth="0.6"
            strokeDasharray="2 2"
            initial={{ opacity: 0 }}
            animate={{ opacity: hoverIdx != null ? 0.9 : 0.35 }}
          />
        ) : null}
      </motion.svg>
      <AnimatePresence mode="popLayout">
        {active ? (
          <motion.div
            key={`${sample.id}-tip-${hoverIdx ?? "last"}`}
            className="pointer-events-none absolute top-2 rounded-lg border border-blue-100 bg-white/95 px-2.5 py-1.5 text-xs shadow-md backdrop-blur-sm"
            style={{ left: `${Math.min(78, Math.max(4, active.x - 8))}%` }}
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.18 }}
          >
            <span className="font-semibold tabular-nums text-blue-700">{active.v.toFixed(0)}</span>
            <span className="text-gray-500"> · sample index</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <p className="mt-2 text-[11px] text-gray-500">Drag cursor across chart — illustrative series only.</p>
    </div>
  );
}

const panelVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

const listVariants = {
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: 12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
};

export function ProductProof({
  onOpenDemo,
  hasAccess,
  guestAllowed,
}: {
  onOpenDemo: () => void;
  hasAccess: boolean;
  guestAllowed: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const [id, setId] = useState<(typeof SAMPLES)[number]["id"]>("RELIANCE");
  const sample = SAMPLES.find((s) => s.id === id) ?? SAMPLES[0];

  return (
    <section id="proof" className="mx-auto max-w-6xl scroll-mt-20 px-5 pt-24 md:pt-32">
      <motion.div
        className="mx-auto mb-10 max-w-2xl text-center"
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Product proof</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          Pick a stock. See the chart and a sourced brief.
        </h2>
      </motion.div>

      <motion.div
        className="rounded-3xl border border-white/70 bg-white/60 p-5 shadow-[var(--shadow-lg)] backdrop-blur-xl sm:p-8"
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.55, delay: 0.05 }}
        whileHover={reduceMotion ? undefined : { boxShadow: "0 24px 48px -12px rgba(26, 115, 232, 0.18)" }}
      >
        <div role="tablist" aria-label="Sample securities" className="relative flex flex-wrap gap-2">
          {SAMPLES.map((s) => {
            const selected = s.id === id;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setId(s.id)}
                className={`relative z-10 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  selected ? "border-blue-600 text-white" : "border-gray-200 bg-white text-gray-700 hover:border-blue-200 hover:text-blue-700"
                }`}
              >
                {selected ? (
                  <motion.span
                    layoutId="proof-tab-pill"
                    className="absolute inset-0 rounded-full bg-blue-600"
                    style={{ zIndex: -1 }}
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                ) : null}
                {s.id}
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={sample.id + "-chart"}
              variants={panelVariants}
              initial="hidden"
              animate="show"
              exit="exit"
            >
              <motion.p
                className="text-sm font-medium text-gray-900"
                layout="position"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              >
                {sample.name}
              </motion.p>
              <IllustrativeChart sample={sample} reduceMotion={!!reduceMotion} />
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div key={sample.id + "-brief"} variants={panelVariants} initial="hidden" animate="show" exit="exit">
              <p className="text-sm font-medium text-gray-900">AI brief</p>
              <motion.ul className="mt-3 space-y-3" variants={listVariants} initial="hidden" animate="show">
                {sample.brief.map((b, i) => (
                  <motion.li
                    key={b.text}
                    variants={itemVariants}
                    className="group rounded-xl border border-transparent px-3 py-2 text-sm leading-6 text-gray-700 transition-colors hover:border-blue-100 hover:bg-blue-50/50"
                    whileHover={reduceMotion ? undefined : { scale: 1.01 }}
                  >
                    <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                      {i + 1}
                    </span>
                    {b.text}
                    <motion.span
                      className="mt-1 block text-xs text-gray-500 transition-colors group-hover:text-blue-600/80"
                      initial={false}
                    >
                      Source: {b.cite}
                    </motion.span>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
          </AnimatePresence>
        </div>

        <motion.p
          className="mt-6 border-t border-gray-200/70 pt-4 text-xs leading-5 text-gray-500"
          initial={reduceMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          Illustrative sample, not live data or a recommendation. The live terminal shows real prices with the source and time of each figure.{" "}
          {hasAccess ? (
            <Link href="/Home" className="font-medium text-blue-600 transition hover:text-blue-800 hover:underline">
              Open terminal →
            </Link>
          ) : guestAllowed ? (
            <button
              type="button"
              onClick={onOpenDemo}
              className="font-medium text-blue-600 transition hover:text-blue-800 hover:underline"
            >
              Open the live demo →
            </button>
          ) : (
            <Link href="/signup" className="font-medium text-blue-600 transition hover:text-blue-800 hover:underline">
              Create a free account →
            </Link>
          )}
        </motion.p>
      </motion.div>
    </section>
  );
}
