"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Panel } from "@/components/layout/page-header";
import { useTransmission } from "@/hooks/use-driver-nudges";
import { usePublishMascotTip } from "@/components/mascot/mascot-bus";
import { buildBookNudges, type BookItem } from "@/lib/guide/driver-rules";
import { cn } from "@/lib/utils";

const sign = (n: number, d = 2) => `${n >= 0 ? "+" : ""}${n.toFixed(d)}`;

/** "What your book leans on": one-glance driver exposure for a portfolio or a scanner result list, one click from the analysis. */
export function BookDriverNudges({ items, scope, title = "What your book leans on" }: { items: BookItem[]; scope: "portfolio" | "scan"; title?: string }) {
  const { betas, shocks } = useTransmission();
  const { nudges, coveragePct } = useMemo(() => buildBookNudges(items, betas, shocks), [items, betas, shocks]);
  const top = nudges[0];
  const noun = scope === "portfolio" ? "of your portfolio" : "of these stocks";

  usePublishMascotTip(
    top ? `${scope}:${top.factor}:${top.sharePct}` : null,
    top
      ? {
          gesture: "point",
          text: `${top.sharePct}% ${noun} leans on ${top.label}${top.todayMove != null ? `, ${sign(top.todayMove, 1)}${top.todayUnit} today` : ""}. Tap to see it.`,
          cta: { label: top.cta, href: top.href },
        }
      : null,
  );

  if (!nudges.length) return null;
  return (
    <Panel
      title={title}
      subtitle={`Global drivers behind ${scope === "portfolio" ? "your holdings" : "these matches"}, by ${scope === "portfolio" ? "value" : "number of stocks"} (${coveragePct}% mapped to a sector). Click a driver for the full analysis.`}
    >
      <ul className="grid gap-3 md:grid-cols-3">
        {nudges.map((n) => (
          <li key={n.factor} className="rounded-lg border border-border bg-card/50 p-3 text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">{n.label}</span>
              {n.todayMove != null ? (
                <span className={cn("text-xs tabular-nums", n.todayMove >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {sign(n.todayMove, 1)}
                  {n.todayUnit} today
                </span>
              ) : null}
            </div>
            <p className="mt-1">
              <span className="text-2xl font-bold tabular-nums">{n.sharePct}%</span>{" "}
              <span className="text-muted-foreground">
                {noun} · {n.names} of {n.total} {scope === "portfolio" ? "holdings" : "stocks"}
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Mostly {n.topNames.join(", ")}
              {n.impliedPct != null ? (
                <>
                  {" "}
                  · implied today <span className={cn("font-medium", n.impliedPct >= 0 ? "text-emerald-600" : "text-rose-600")}>{sign(n.impliedPct)}%</span>
                </>
              ) : null}
            </p>
            <Link href={n.href} className="mt-2 inline-block text-xs font-semibold text-primary hover:underline">
              {n.cta} →
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
