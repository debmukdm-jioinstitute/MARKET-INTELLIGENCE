"use client";

import { WORLDMONITOR_PUBLIC_URL, WORLDMONITOR_UPSTREAM_REPO } from "@/lib/worldmonitor/public-url";
import Link from "next/link";

type Props = {
  /** finance | world | tech — passed when self-host supports ?variant= (upstream may ignore). */
  variant?: string;
};

export function WorldMonitorFrame({ variant = "finance" }: Props) {
  const src = WORLDMONITOR_PUBLIC_URL.includes("?")
    ? `${WORLDMONITOR_PUBLIC_URL}&variant=${variant}`
    : `${WORLDMONITOR_PUBLIC_URL}?variant=${variant}`;

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-3">
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <a
          href={WORLDMONITOR_PUBLIC_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600/90"
        >
          Open World Monitor full screen
        </a>
        <span className="text-xs text-muted-foreground">If the embed is blank, use the button — some hosts block iframes.</span>
      </p>
      <p className="text-xs text-muted-foreground">
        Global situational dashboard (news, maps, CII, markets) via{" "}
        <a href={WORLDMONITOR_UPSTREAM_REPO} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
          World Monitor
        </a>{" "}
        (AGPL-3.0). Self-host:{" "}
        <Link href="/help#worldmonitor" className="text-blue-600 hover:underline">
          help → World Monitor
        </Link>
        .
      </p>
      <iframe
        title="World Monitor — finance variant"
        src={src}
        className="min-h-[720px] w-full flex-1 rounded-xl border border-border bg-muted/20"
        allow="fullscreen"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
