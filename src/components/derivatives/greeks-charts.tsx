"use client";

import { Lines, OiBars } from "@/components/charts/terminal-charts";
import type { OptionChainSnapshot } from "@/lib/feeds/derivatives/types";

/** IV smile — call/put implied volatility across the strike ladder. */
export function IvSmileChart({ snapshot }: { snapshot: OptionChainSnapshot }) {
  const data = snapshot.rows.map((r) => ({
    strike: r.strike,
    callIv: r.call?.greeks.iv ?? 0,
    putIv: r.put?.greeks.iv ?? 0,
  }));
  return (
    <Lines
      data={data}
      xKey="strike"
      keys={[
        { key: "callIv", color: "#34d399", name: "Call IV" },
        { key: "putIv", color: "#fb7185", name: "Put IV" },
      ]}
    />
  );
}

/** Call vs put open interest by strike. */
export function OiByStrikeChart({ snapshot }: { snapshot: OptionChainSnapshot }) {
  const data = snapshot.rows.map((r) => ({
    strike: r.strike,
    callOi: r.call?.oi ?? 0,
    putOi: r.put?.oi ?? 0,
  }));
  return <OiBars data={data} />;
}
