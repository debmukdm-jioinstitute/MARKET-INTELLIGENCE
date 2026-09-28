"use client";

import {
  worldMonitorExternalUrl,
  worldMonitorLaunchPath,
  WORLDMONITOR_UPSTREAM_REPO,
} from "@/lib/worldmonitor/public-url";
import Link from "next/link";
import { useState, useRef } from "react";
import { ExternalLink, RefreshCw, Globe, ShieldCheck } from "lucide-react";

type Props = {
  variant?: string;
};

export function WorldMonitorFrame({ variant: _variant = "finance" }: Props) {
  const launchPath = worldMonitorLaunchPath();
  const externalUrl = worldMonitorExternalUrl();
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">World Monitor</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Proxy
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Geopolitical news, radar & markets proxied at <code className="font-mono text-xs">{launchPath}</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-accent transition-colors"
            title="Reload dashboard"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          
          <a
            href={launchPath}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white shadow hover:bg-blue-600/90 transition-colors"
          >
            Full Window
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Upstream App
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Frame Container */}
      <div className="relative min-h-[720px] h-[80vh] w-full rounded-xl border border-border bg-black/90 shadow-md overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="text-sm font-medium text-foreground">Loading World Monitor Dashboard...</p>
            <p className="text-xs text-muted-foreground">Connecting to proxied global intelligence feeds</p>
          </div>
        )}

        <iframe
          key={iframeKey}
          ref={iframeRef}
          title="World Monitor — Global Intelligence Dashboard"
          src={launchPath}
          onLoad={() => setIsLoading(false)}
          className="h-full w-full border-0"
          allow="fullscreen; autoplay; clipboard-write; encrypted-media; picture-in-picture"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      {/* Attribution & Info */}
      <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground px-1">
        <p className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          Proxied reverse endpoint at <span className="font-medium text-foreground">{launchPath}</span>
        </p>
        <p>
          Source:{" "}
          <a
            href={WORLDMONITOR_UPSTREAM_REPO}
            className="text-blue-600 hover:underline font-medium"
            target="_blank"
            rel="noopener noreferrer"
          >
            koala73/worldmonitor
          </a>{" "}
          (AGPL-3.0) ·{" "}
          <Link href="/help#worldmonitor" className="text-blue-600 hover:underline">
            Integration Docs
          </Link>
        </p>
      </div>
    </div>
  );
}
