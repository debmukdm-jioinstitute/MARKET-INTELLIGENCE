"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Panel } from "@/components/layout/page-header";
import { useTransmission } from "@/hooks/use-driver-nudges";
import { usePublishMascotTip } from "@/components/mascot/mascot-bus";
import { buildExposure, buildIndexNudges, DRIVER_META } from "@/lib/guide/driver-rules";
import type { FactorId } from "@/lib/transmission/betas";
import { cn } from "@/lib/utils";

const sign = (n: number, d = 2) => `${n >= 0 ? "+" : ""}${n.toFixed(d)}`;
const FACTOR_PAGES: Record<string, FactorId> = { usdinr: "usdinr", brent: "brent" };

/** Index pages: what global drivers move this index. Driver pages (rupee, Brent): which sectors feel it. */
export function MarketDriverNudges({ marketKey, name, sectors }: { marketKey: string; name: string; sectors: { name: string; weight: number }[] }) {
  const { betas, shocks, loading } = useTransmission();
  const factor = FACTOR_PAGES[marketKey];
  const index = useMemo(() => (factor ? null : buildIndexNudges(sectors, betas, shocks)), [factor, sectors, betas, shocks]);
  const exposure = useMemo(() => (factor ? buildExposure(factor, betas, shocks) : []), [factor, betas, shocks]);
  const top = index?.nudges[0];

  usePublishMascotTip(
    top ? `${marketKey}:${top.factor}` : factor && exposure.length ? `${marketKey}:exposure` : null,
    top
      ? {
          gesture: "point",
          text: `${name} is most sensitive to ${top.label}${top.todayMove != null ? `, ${sign(top.todayMove, 1)}${top.todayUnit} today` : ""}. Tap to see it.`,
          cta: { label: top.cta, href: top.href },
        }
      : factor && exposure.length
        ? { gesture: "inspect", text: `${exposure[0].label} feels ${DRIVER_META[factor].short} most. See who else is exposed.`, cta: { label: "Sector exposure", href: "/macro/transmission" } }
        : null,
  );

  if (loading && !betas) return null;

  if (factor) {
    if (!exposure.length) return null;
    return (
      <Panel title={`Who feels ${DRIVER_META[factor].short}`} subtitle="Sectors with a statistically significant sensitivity, strongest first, with today's implied effect.">
        <ul className="grid gap-3 md:grid-cols-4">
          {exposure.map((e) => (
            <li key={e.label} className="rounded-lg border border-border bg-card/50 p-3 text-sm">
              <p className="font-semibold">{e.label}</p>
              <p className="text-xs text-muted-foreground">Sensitivity {sign(e.beta)} {DRIVER_META[factor].unitNote}</p>
              {e.impliedPct != null ? (
                <p className={cn("mt-1 text-xs font-medium", e.impliedPct >= 0 ? "text-emerald-600" : "text-rose-600")}>Implied today {sign(e.impliedPct)}%</p>
              ) : null}
            </li>
          ))}
        </ul>
        <Link href="/macro/transmission" className="mt-3 inline-block text-xs font-semibold text-primary hover:underline">Full sector map →</Link>
      </Panel>
    );
  }

  if (!index?.nudges.length) return null;
  return (
    <Panel
      title="What moves this index"
      subtitle={`Global drivers weighted by sector (${index.coveragePct}% of the index covered). Click a driver for the full analysis.`}
    >
      <ul className="grid gap-3 md:grid-cols-3">
        {index.nudges.map((n) => (
          <li key={n.factor} className="rounded-lg border border-border bg-card/50 p-3 text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">{n.label}</span>
              {n.todayMove != null ? (
                <span className={cn("tabular-nums text-xs", n.todayMove >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {sign(n.todayMove, 1)}
                  {n.todayUnit} today
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-muted-foreground">{n.headline}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Index sensitivity {sign(n.beta)}
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
