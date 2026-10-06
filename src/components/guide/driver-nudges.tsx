"use client";

import Link from "next/link";
import { Panel } from "@/components/layout/page-header";
import { useDriverNudges } from "@/hooks/use-driver-nudges";
import { usePublishMascotTip } from "@/components/mascot/mascot-bus";
import { cn } from "@/lib/utils";

const sign = (n: number, d = 2) => `${n >= 0 ? "+" : ""}${n.toFixed(d)}`;

/** One-glance "what moves this stock" card: the driver, today's move and the implied effect, one click from the analysis. */
export function DriverNudges({ symbol, name }: { symbol: string; name: string }) {
  const { nudges, sectorLabel, loading } = useDriverNudges(symbol, name);
  const top = nudges[0];

  usePublishMascotTip(
    top ? `${symbol}:${top.factor}` : null,
    top
      ? {
          gesture: "point",
          text:
            top.todayMove != null
              ? `${name} leans on ${top.label}. It's ${sign(top.todayMove, 1)}${top.todayUnit} today. Tap to see why.`
              : `${name} leans on ${top.label}. Tap to see the analysis.`,
          cta: { label: top.cta, href: top.href },
        }
      : null,
  );

  if (!nudges.length) return loading ? <p className="text-sm text-muted-foreground">Checking what moves {symbol}…</p> : null;

  return (
    <Panel
      title="What moves this stock"
      subtitle={`Global drivers ${sectorLabel ? `for ${sectorLabel} ` : ""}from measured sensitivities. Click a driver for the full analysis.`}
    >
      <ul className="grid gap-3 md:grid-cols-3">
        {nudges.map((n) => {
          const imp = n.impliedPct;
          return (
            <li key={n.factor} className="rounded-lg border border-border bg-card/50 p-3 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{n.label}</span>
                {n.todayMove != null ? (
                  <span className={cn("tabular-nums text-sm", n.todayMove >= 0 ? "text-emerald-600" : "text-rose-600")}>
                    {sign(n.todayMove, 1)}
                    {n.todayUnit} today
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-muted-foreground">{n.reason ?? n.headline}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Sector sensitivity {sign(n.beta)}
                {n.significant ? " (statistically significant)" : ""}
                {imp != null ? (
                  <>
                    {" "}
                    · implied today{" "}
                    <span className={cn("font-medium", imp >= 0 ? "text-emerald-600" : "text-rose-600")}>{sign(imp)}%</span>
                  </>
                ) : null}
              </p>
              <Link href={n.href} className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">
                {n.cta} →
              </Link>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
