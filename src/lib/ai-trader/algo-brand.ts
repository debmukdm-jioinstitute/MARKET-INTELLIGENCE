import { cn } from "@/lib/utils";

export type AlgoRiskLevel = "low" | "medium" | "high";

/** Recharts / SVG — CSS variables resolve in the browser. */
export const ALGO_CHART = {
  grid: "var(--border)",
  axisFill: "var(--muted-foreground)",
  tooltip: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    fontSize: 12,
  },
  line: {
    primary: "var(--primary)",
    up: "var(--chart-2)",
    down: "var(--destructive)",
    warn: "var(--chart-3)",
    accent: "var(--chart-5)",
    muted: "var(--muted-foreground)",
  },
} as const;

export function pnlClass(v: number, neutral = "text-muted-foreground") {
  if (v > 0) return "text-chart-2";
  if (v < 0) return "text-destructive";
  return neutral;
}

export function regimeClass(regime?: string | null) {
  if (!regime) return "text-muted-foreground";
  if (regime.includes("BULL")) return "text-chart-2";
  if (regime.includes("BEAR")) return "text-destructive";
  return "text-chart-3";
}

export function riskActiveBg(r: AlgoRiskLevel) {
  return r === "low" ? "bg-chart-1" : r === "medium" ? "bg-chart-3 text-foreground" : "bg-chart-2";
}

export function riskTabClass(r: AlgoRiskLevel, active: boolean) {
  return cn(
    "algo-risk-tab capitalize",
    active && cn(riskActiveBg(r), "text-primary-foreground border-transparent"),
    active && r === "medium" && "text-foreground",
  );
}

export function segmentClass(active: boolean) {
  return cn(
    "algo-segment",
    active && "algo-segment-active",
  );
}

export const pnlFmt = (v: number) =>
  `₹${v >= 0 ? "+" : ""}${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
