"use client";
import { RangeProvider } from "@/components/ts-charts/range-context";
import { TsChart } from "@/components/ts-charts/ts-chart";

/** One flows chart for the Markets teaser (full set lives under Funds & Flows). */
export default function FlowsGlance() {
  return (
    <RangeProvider initial="3Y">
      <div style={{ color: "var(--ink)" }}><TsChart id="flows.cum_by_type" /></div>
    </RangeProvider>
  );
}
