"use client";

import { BENCHMARK_OPTIONS, type BenchmarkId } from "@/lib/my-portfolio/benchmark-options";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export function BenchmarkSelect({
  value,
  disabled,
  onChange,
  className,
}: {
  value: BenchmarkId;
  disabled?: boolean;
  onChange: (id: BenchmarkId) => void;
  className?: string;
}) {
  const india = BENCHMARK_OPTIONS.filter((o) => o.region === "IN");
  const vol = BENCHMARK_OPTIONS.filter((o) => o.region === "VOL");
  const us = BENCHMARK_OPTIONS.filter((o) => o.region === "US");

  return (
    <label className={cn("inline-flex min-h-11 items-center gap-2 text-sm", className)}>
      <span className="text-muted-foreground">Benchmark</span>
      <span className="relative inline-flex min-w-[11rem]">
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value as BenchmarkId)}
          className="w-full appearance-none rounded-lg border border-border bg-card py-2 pl-3 pr-8 text-sm font-semibold text-foreground shadow-sm transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          aria-label="Portfolio benchmark index"
        >
          <optgroup label="India indices">
            {india.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </optgroup>
          {vol.length ? (
            <optgroup label="Volatility">
              {vol.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ) : null}
          <optgroup label="US indices">
            {us.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </optgroup>
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      </span>
    </label>
  );
}
