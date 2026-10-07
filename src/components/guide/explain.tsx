"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, ChevronDown, Info } from "lucide-react";
import type { ReactNode } from "react";

export type Tone = "good" | "watch" | "bad" | "info";

const TONE: Record<Tone, { box: string; icon: string; Icon: typeof Info }> = {
  good: { box: "border-emerald-500/30 bg-emerald-500/5", icon: "text-emerald-600", Icon: CheckCircle2 },
  watch: { box: "border-amber-500/40 bg-amber-500/5", icon: "text-amber-600", Icon: AlertTriangle },
  bad: { box: "border-rose-500/40 bg-rose-500/5", icon: "text-rose-600", Icon: AlertTriangle },
  info: { box: "border-border bg-card", icon: "text-primary", Icon: Info },
};

/** One plain-English sentence that tells a beginner what the panel means. Always the first thing in a panel. */
export function Takeaway({ tone, children, sub }: { tone: Tone; children: ReactNode; sub?: ReactNode }) {
  const t = TONE[tone];
  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-4", t.box)} role="status">
      <t.Icon className={cn("mt-0.5 size-6 shrink-0", t.icon)} aria-hidden />
      <div className="min-w-0">
        <p className="text-lg font-semibold leading-snug text-foreground">{children}</p>
        {sub ? <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{sub}</p> : null}
      </div>
    </div>
  );
}

/** A big number with a plain label and one line saying what it means. */
export function Tile({ label, value, hint, tone = "info", footer }: { label: string; value: ReactNode; hint?: string; tone?: Tone; footer?: ReactNode }) {
  const t = TONE[tone];
  return (
    <div className={cn("rounded-xl border p-4", tone === "info" ? "border-border bg-card" : t.box)}>
      <p className="text-base font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums leading-tight">{value}</p>
      {hint ? <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{hint}</p> : null}
      {footer ? <div className="mt-2">{footer}</div> : null}
    </div>
  );
}

/** Detail that most readers do not need on first look. Closed by default, large tap target. */
export function Fold({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group rounded-xl border border-border bg-card" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-base font-semibold">
        {title}
        <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="space-y-3 border-t border-border px-4 py-4">{children}</div>
    </details>
  );
}
