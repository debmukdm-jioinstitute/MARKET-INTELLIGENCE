"use client";

import {
  worldMonitorExternalUrl,
  worldMonitorLaunchPath,
  WORLDMONITOR_UPSTREAM_REPO,
} from "@/lib/worldmonitor/public-url";
import Link from "next/link";
import { useState } from "react";

type Props = {
  variant?: string;
};

export function WorldMonitorFrame({ variant: _variant = "finance" }: Props) {
  const launchPath = worldMonitorLaunchPath();
  const externalUrl = worldMonitorExternalUrl();
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-muted/30 p-5">
        <p className="text-sm text-muted-foreground">
          World Monitor is a large global dashboard (maps, news, CII). It loads fastest in its own tab — not inside this page.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={launchPath}
            prefetch={false}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600/90"
          >
            Open World Monitor
          </Link>
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/40"
          >
            Open on worldmonitor.app
          </a>
          {!showPreview ? (
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="rounded-lg border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted/40"
            >
              Preview inline (slower)
            </button>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Proxied at <span className="font-medium text-foreground">{launchPath}</span> on our domain. Source:{" "}
        <a href={WORLDMONITOR_UPSTREAM_REPO} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
          koala73/worldmonitor
        </a>{" "}
        (AGPL-3.0).{" "}
        <Link href="/help#worldmonitor" className="text-blue-600 hover:underline">
          Help
        </Link>
        .
      </p>

      {showPreview ? (
        <iframe
          title="World Monitor — finance variant"
          src={launchPath}
          loading="lazy"
          className="min-h-[480px] w-full rounded-xl border border-border bg-muted/20"
          allow="fullscreen"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : null}
    </div>
  );
}
