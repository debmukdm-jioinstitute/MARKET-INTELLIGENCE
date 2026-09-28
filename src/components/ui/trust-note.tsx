"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function relative(iso: string, now: number): string | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/**
 * Point-of-use trust line: where the data came from, how fresh it is, how it is computed,
 * and that it is not advice. Place directly under the numbers it describes.
 */
export function TrustNote({
  source,
  asOf,
  delayed,
  note = "Not investment advice",
  methodology = "/methodology",
  className,
}: {
  /** Provider name(s), e.g. "NSE India". */
  source: string;
  /** ISO timestamp of the underlying data. */
  asOf?: string | null;
  /** e.g. "15 min delayed". */
  delayed?: string;
  /** Closing caveat; defaults to the advice disclaimer. Use for modeled outputs. */
  note?: string;
  methodology?: string;
  className?: string;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const age = asOf && now ? relative(asOf, now) : null;
  return (
    <p className={cn("text-xs leading-5 text-muted-foreground", className)}>
      Source: {source}
      {age ? <> · Updated <time dateTime={asOf ?? undefined}>{age}</time></> : null}
      {delayed ? <> · {delayed}</> : null}
      {" · "}
      <Link href={methodology} className="underline-offset-2 hover:underline">Methodology</Link>
      {` · ${note}`}
    </p>
  );
}
