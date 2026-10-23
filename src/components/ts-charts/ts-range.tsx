"use client";
import { useRange } from "./range-context";

const P = [["1Y", 1], ["3Y", 3], ["5Y", 5], ["10Y", 10], ["20Y", 20]] as const;

export function TsRange({ spanYears }: { spanYears: number }) {
  const r = useRange();
  const keys = [...P.filter(([, y]) => y < spanYears).map(([k]) => k), "All"];
  return (
    <div role="group" aria-label="Time range" className="flex gap-1 overflow-x-auto text-[13px] [scrollbar-width:none]">
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          aria-pressed={r.preset === k}
          onClick={() => r.set(k)}
          className="min-h-11 min-w-11 shrink-0 rounded border px-3 sm:min-h-8 sm:min-w-0 sm:px-2"
          style={{ borderColor: "var(--rule)", background: r.preset === k ? "var(--ink)" : "transparent", color: r.preset === k ? "var(--paper)" : "var(--ink-2)" }}
        >
          {k}
        </button>
      ))}
    </div>
  );
}
