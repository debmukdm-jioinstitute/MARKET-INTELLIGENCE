"use client";

import { Panel } from "@/components/layout/page-header";
import {
  worldMonitorExternalUrl,
  worldMonitorLaunchPath,
  WORLDMONITOR_THEME_STORAGE_KEY,
  WORLDMONITOR_UPSTREAM_REPO,
} from "@/lib/worldmonitor/public-url";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";

type Props = {
  variant?: string;
};

function applyEmbeddedLightTheme() {
  try {
    localStorage.setItem(WORLDMONITOR_THEME_STORAGE_KEY, "light");
  } catch {
    /* private mode / blocked storage */
  }
}

export function WorldMonitorFrame({ variant: _variant = "finance" }: Props) {
  const launchPath = worldMonitorLaunchPath();
  const externalUrl = worldMonitorExternalUrl();
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [embedReady, setEmbedReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useLayoutEffect(() => {
    applyEmbeddedLightTheme();
    setEmbedReady(true);
  }, []);

  const handleRefresh = () => {
    applyEmbeddedLightTheme();
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  const btnGhost =
    "inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-blue-600/40 hover:bg-blue-600/5 hover:text-blue-600";
  const btnPrimary =
    "inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700";

  return (
    <div className="flex flex-col gap-4 pb-10">
      <Panel
        title="Dashboard"
        subtitle={
          <>
            Proxied endpoint{" "}
            <span className="break-all font-medium text-blue-600 tabular-nums">{launchPath}</span>
          </>
        }
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={handleRefresh} className={btnGhost} title="Reload dashboard">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <a href={launchPath} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
              Open full screen
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <a href={externalUrl} target="_blank" rel="noopener noreferrer" className={btnGhost}>
              Upstream site
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        }
      >
        <div
          className={cn(
            "relative min-h-[720px] h-[min(80vh,900px)] w-full overflow-hidden rounded-lg border border-border bg-muted/30",
          )}
        >
          {isLoading ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-card/90">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-blue-600/25 border-t-blue-600" />
              <p className="text-sm font-semibold text-foreground">Loading dashboard</p>
              <p className="text-xs text-muted-foreground">Map layers, panels, and signals…</p>
            </div>
          ) : null}

          {embedReady ? (
            <iframe
              key={iframeKey}
              ref={iframeRef}
              title="World Monitor — Global Intelligence Dashboard"
              src={launchPath}
              onLoad={() => setIsLoading(false)}
              className="h-full w-full border-0 bg-background"
              allow="fullscreen; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : null}
        </div>
      </Panel>

      <p className="text-xs text-muted-foreground">
        Proxied on Market Intelligence · read-only intelligence feeds · embedded light theme when same-origin proxy is active.{" "}
        <a
          href={WORLDMONITOR_UPSTREAM_REPO}
          className="font-medium text-blue-600 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          koala73/worldmonitor
        </a>{" "}
        (AGPL-3.0) ·{" "}
        <Link href="/help#worldmonitor" className="font-medium text-blue-600 hover:underline">
          Help
        </Link>
      </p>
    </div>
  );
}
