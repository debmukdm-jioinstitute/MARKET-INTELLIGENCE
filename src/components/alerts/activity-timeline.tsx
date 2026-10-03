"use client";

import { BellRing } from "lucide-react";

export type AlertEvent = { id: string; fired_at: string; message: string };

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Recent fired alerts as a simple activity timeline. Data comes straight from /api/alerts. */
export function ActivityTimeline({ events }: { events: AlertEvent[] }) {
  if (!events.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-sm font-semibold text-foreground">Quiet so far</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Nothing has fired yet. When a rule's conditions are met, the alert lands here — and reaches you by push or email.
        </p>
      </div>
    );
  }
  return (
    <ol className="relative space-y-4 border-l-2 border-border pl-6">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[31px] top-0.5 flex size-4 items-center justify-center rounded-full bg-primary/15 text-primary">
            <BellRing className="size-2.5" />
          </span>
          <p className="text-sm text-foreground">{e.message}</p>
          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{fmtWhen(e.fired_at)}</p>
        </li>
      ))}
    </ol>
  );
}
