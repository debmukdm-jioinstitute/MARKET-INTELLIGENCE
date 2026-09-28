"use client";

import {
  worldMonitorExternalUrl,
  worldMonitorLaunchPath,
  WORLDMONITOR_UPSTREAM_REPO,
} from "@/lib/worldmonitor/public-url";
import Link from "next/link";
import { useState, useRef } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";

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

  const btnGhost =
    "inline-flex items-center gap-1.5 rounded-md border border-[#2a3a2a] bg-[#111411] px-3 py-1.5 text-xs font-semibold text-[#c8d0c8] transition-colors hover:border-[#39ff14]/40 hover:text-[#39ff14]";
  const btnPrimary =
    "inline-flex items-center gap-1.5 rounded-md border border-[#39ff14] bg-[#39ff14] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-[#0a0d0a] shadow-[0_0_16px_rgba(57,255,20,0.35)] transition-opacity hover:opacity-90";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#1a2e1a] bg-[#0c100c] px-4 py-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6b7a6b]">Global situation</p>
          <p className="mt-0.5 text-sm text-[#b0bab0]">
            Endpoint{" "}
            <span className="break-all font-medium text-[#39ff14] tabular-nums">{launchPath}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleRefresh} className={btnGhost} title="Reload dashboard">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <a href={launchPath} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
            Mission view
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <a href={externalUrl} target="_blank" rel="noopener noreferrer" className={btnGhost}>
            Upstream
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      <div className="relative min-h-[720px] h-[min(80vh,900px)] w-full overflow-hidden rounded-lg border border-[#1a2e1a] bg-black shadow-[inset_0_0_60px_rgba(0,0,0,0.8)]">
        {isLoading ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#070807]/95">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#39ff14]/30 border-t-[#39ff14]" />
            <p className="text-sm font-semibold text-[#39ff14]">Preparing dashboard</p>
            <p className="text-xs text-[#7a857a]">Map layers, panels, and signals loading…</p>
          </div>
        ) : null}

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

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#1a2e1a] pt-3 text-xs text-[#7a857a]">
        <p>Proxied on Market Intelligence · read-only intelligence feeds</p>
        <p>
          <a
            href={WORLDMONITOR_UPSTREAM_REPO}
            className="font-medium text-[#39ff14] hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            koala73/worldmonitor
          </a>{" "}
          (AGPL-3.0) ·{" "}
          <Link href="/help#worldmonitor" className="text-[#39ff14] hover:underline">
            Help
          </Link>
        </p>
      </div>
    </div>
  );
}
