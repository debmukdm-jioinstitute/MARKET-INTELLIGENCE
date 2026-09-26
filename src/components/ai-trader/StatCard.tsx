"use client";

import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: "green" | "red" | "yellow" | "blue" | "purple" | "default";
  pulse?: boolean;
}

const colorClass: Record<string, string> = {
  green: "text-chart-2",
  red: "text-destructive",
  yellow: "text-chart-3",
  blue: "text-primary",
  purple: "text-chart-5",
  default: "text-foreground",
};

export default function StatCard({ label, value, sub, color = "default", pulse }: StatCardProps) {
  return (
    <div className="t-panel p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className={cn("mt-1 flex items-center gap-2 text-xl font-bold tabular-nums", colorClass[color])}>
        {pulse ? <span className="h-2 w-2 rounded-full bg-chart-2 t-pulse" /> : null}
        {value}
      </div>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}
