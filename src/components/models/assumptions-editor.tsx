"use client";

import { ASSUMPTION_SPECS } from "@/lib/models/assumptions";
import { formatByFmt } from "@/lib/models/format";
import type { Assumptions } from "@/lib/models/types";
import { useMemo, useState } from "react";

const SCALAR_SECTIONS_ORDER = ["Cost of capital", "Operating", "Terminal value", "Capital allocation", "Working capital"];

function toInputValue(value: number, fmt: string): string {
  if (fmt === "pct" || fmt === "pct2") return (value * 100).toFixed(fmt === "pct2" ? 2 : 1);
  return String(value);
}
function fromInputValue(text: string, fmt: string): number {
  const n = Number(text);
  if (!Number.isFinite(n)) return NaN;
  return fmt === "pct" || fmt === "pct2" ? n / 100 : n;
}

export function AssumptionsEditor({
  assumptions,
  currency,
  onChange,
}: {
  assumptions: Assumptions;
  currency: string;
  onChange: (key: string, value: number) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const scalarSpecs = useMemo(
    () => ASSUMPTION_SPECS.filter((s) => s.kind === "scalar" && s.key !== "projection_years" && s.key !== "price" && s.key !== "shares_outstanding"),
    [],
  );
  const bySection = useMemo(() => {
    const m = new Map<string, typeof scalarSpecs>();
    for (const s of scalarSpecs) {
      if (!m.has(s.section)) m.set(s.section, []);
      m.get(s.section)!.push(s);
    }
    return m;
  }, [scalarSpecs]);

  return (
    <div className="space-y-5">
      {SCALAR_SECTIONS_ORDER.filter((s) => bySection.has(s)).map((section) => (
        <div key={section}>
          <p className="mb-2 text-sm uppercase tracking-wider text-primary">{section}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {bySection.get(section)!.map((spec) => {
              const value = assumptions.values[spec.key] as number;
              const draftKey = spec.key;
              const displayValue = drafts[draftKey] ?? toInputValue(value, spec.fmt);
              const overridden = assumptions.overridden.includes(spec.key);
              return (
                <div key={spec.key} className="space-y-1">
                  <label className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{spec.label}</span>
                    {overridden ? <span className="text-sm font-semibold text-blue-600">edited</span> : null}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={displayValue}
                      step={spec.fmt === "int" ? 1 : "any"}
                      onChange={(e) => setDrafts((d) => ({ ...d, [draftKey]: e.target.value }))}
                      onBlur={() => {
                        const n = fromInputValue(displayValue, spec.fmt);
                        if (Number.isFinite(n)) {
                          const clamped = Math.max(spec.lo ?? -Infinity, Math.min(spec.hi ?? Infinity, n));
                          onChange(spec.key, clamped);
                          setDrafts((d) => {
                            const next = { ...d };
                            delete next[draftKey];
                            return next;
                          });
                        }
                      }}
                      className="w-full rounded-md border border-input bg-input/30 px-2.5 py-1.5 text-sm tabular-nums outline-none focus-visible:border-ring"
                    />
                    {spec.fmt === "pct" || spec.fmt === "pct2" ? (
                      <span className="text-sm text-muted-foreground">%</span>
                    ) : spec.fmt === "mult" ? (
                      <span className="text-sm text-muted-foreground">x</span>
                    ) : null}
                  </div>
                  <p className="text-sm leading-snug text-muted-foreground/70">{assumptions.basis[spec.key]}</p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <p className="text-sm text-muted-foreground">
        Current share price is {formatByFmt(assumptions.values.price as number, "price", currency)}; shares outstanding{" "}
        {formatByFmt(assumptions.values.shares_outstanding as number, "num1")}M.
      </p>
    </div>
  );
}
