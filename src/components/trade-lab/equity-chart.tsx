"use client";

import type { BacktestResult } from "@/lib/trade-lab/backtest";
import { useId } from "react";

const istDate = (epochSec: number) =>
  new Date(epochSec * 1000).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "2-digit",
  });

/**
 * Equity curve built ONLY from the API's real trades: each point compounds
 * one trade's actual return, oldest → newest. When the API returns fewer
 * trades than the full window (it reports the last 8), the chart covers
 * those trades rebased to ₹1 and says so — never a fabricated full curve.
 */
export function EquityChart({ result }: { result: BacktestResult }) {
  const gid = useId().replace(/:/g, "");
  const chrono = [...result.recent].reverse(); // oldest → newest
  const points: { t: number; e: number }[] = [];
  let e = 1;
  for (const tr of chrono) {
    e *= 1 + tr.retPct / 100;
    points.push({ t: tr.exitT, e });
  }
  if (points.length < 2) return null;

  const full = result.trades === result.recent.length; // API returned every trade
  const up = points[points.length - 1].e >= 1;
  const line = up ? "#059669" : "#e11d48";

  const w = 720;
  const h = 220;
  const padL = 10;
  const padR = 54;
  const padT = 14;
  const padB = 28;
  const min = Math.min(1, ...points.map((p) => p.e));
  const max = Math.max(1, ...points.map((p) => p.e));
  const span = max - min || 1;
  const x = (i: number) => padL + (i / (points.length - 1)) * (w - padL - padR);
  const y = (v: number) => padT + (1 - (v - min) / span) * (h - padT - padB);

  const linePath = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.e).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${x(points.length - 1).toFixed(1)},${y(1).toFixed(1)} L${x(0).toFixed(1)},${y(1).toFixed(1)} Z`;
  const last = points[points.length - 1];

  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-52 w-full sm:h-60" role="img" aria-label={`Equity curve of the backtest trades, ending at ${last.e.toFixed(2)} times the starting value`}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={line} stopOpacity={0.25} />
            <stop offset="100%" stopColor={line} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {/* baseline at ₹1 */}
        <line x1={padL} x2={w - padR} y1={y(1)} y2={y(1)} stroke="#9ca3af" strokeWidth={1} strokeDasharray="5 4" />
        <text x={w - padR + 6} y={y(1) + 4} fontSize={11} fill="#6b7280">
          ₹1
        </text>
        <path d={areaPath} fill={`url(#${gid})`} />
        <path d={linePath} fill="none" stroke={line} strokeWidth={2} strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={p.t} cx={x(i)} cy={y(p.e)} r={3} fill="#ffffff" stroke={line} strokeWidth={2}>
            <title>
              Trade {i + 1} · exited {istDate(p.t)} · equity ₹{p.e.toFixed(2)}
            </title>
          </circle>
        ))}
        <circle cx={x(points.length - 1)} cy={y(last.e)} r={4.5} fill={line} />
        <text x={x(points.length - 1) + 8} y={y(last.e) + 4} fontSize={12} fontWeight={700} fill={line}>
          ₹{last.e.toFixed(2)}
        </text>
        <text x={padL} y={h - 8} fontSize={11} fill="#6b7280">
          {istDate(points[0].t)}
        </text>
        <text x={w - padR} y={h - 8} fontSize={11} fill="#6b7280" textAnchor="end">
          {istDate(last.t)}
        </text>
      </svg>
      <figcaption className="mt-1 text-xs leading-5 text-muted-foreground">
        {full
          ? `Full window — all ${result.trades} trade${result.trades === 1 ? "" : "s"}, compounded trade by trade from the API. Each dot is one real trade exit.`
          : `Last ${result.recent.length} of ${result.trades} trades, rebased to ₹1 so the recent shape is visible. Totals for the full window are in the cards below.`}
      </figcaption>
    </figure>
  );
}
