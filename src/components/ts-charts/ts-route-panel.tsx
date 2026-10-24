"use client";
import { usePathname } from "next/navigation";
import { isHubRoute } from "@/lib/hubs";
import { TsPathCharts } from "./ts-path-charts";

/** Appends registry charts for the current route. Hub pages and Home compose their own chart sections, so they are skipped here. */
export function TsRoutePanel() {
  const path = (usePathname() ?? "").replace(/\/$/, "") || "/";
  if (isHubRoute(path)) return null;
  return (
    <div className="mx-auto mt-8 max-w-[1440px] px-3 pb-12 sm:px-6">
      <TsPathCharts path={path} />
    </div>
  );
}
