"use client";

import {
  worldMonitorExternalUrl,
  worldMonitorLaunchPath,
  worldMonitorUsesProxy,
  WORLDMONITOR_UPSTREAM_REPO,
} from "@/lib/worldmonitor/public-url";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  variant?: string;
};

export function WorldMonitorFrame({ variant: _variant = "finance" }: Props) {
  const router = useRouter();
  const launchPath = worldMonitorLaunchPath();
  const externalUrl = worldMonitorExternalUrl();
  const useProxy = worldMonitorUsesProxy();
  const [iframeOk, setIframeOk] = useState(useProxy);

  useEffect(() => {
    if (!useProxy) setIframeOk(false);
  }, [useProxy]);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => router.push(launchPath)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600/90"
        >
          Launch World Monitor {useProxy ? "(in this tab)" : ""}
        </button>
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/40"
        >
          Open on worldmonitor.app
        </a>
      </div>
      <p className="text-xs text-muted-foreground">
        Upstream blocks embedding on other domains — we proxy{" "}
        <span className="font-medium text-foreground">{launchPath}</span> through Market Intelligence so panels and maps
        load on our origin. Data still comes from World Monitor APIs. Source:{" "}
        <a href={WORLDMONITOR_UPSTREAM_REPO} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
          koala73/worldmonitor
        </a>{" "}
        (AGPL-3.0).{" "}
        <Link href="/help#worldmonitor" className="text-blue-600 hover:underline">
          Help
        </Link>
        .
      </p>

      {iframeOk ? (
        <iframe
          title="World Monitor — finance variant"
          src={launchPath}
          className="min-h-[720px] w-full flex-1 rounded-xl border border-border bg-muted/20"
          allow="fullscreen"
          referrerPolicy="no-referrer-when-downgrade"
          onError={() => setIframeOk(false)}
        />
      ) : (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Use Launch World Monitor for the full dashboard.</p>
          <p className="mt-2 max-w-md">Inline preview loads after proxy is live on production. If the frame stays empty, the launch button still opens the proxied app.</p>
        </div>
      )}
    </div>
  );
}
