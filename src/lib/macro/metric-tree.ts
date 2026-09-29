import type { MacroMetric, MacroSectionPayload } from "@/lib/macro/types";

export function flattenMacroMetrics(metrics: MacroMetric[]): MacroMetric[] {
  const out: MacroMetric[] = [];
  for (const m of metrics) {
    out.push(m);
    if (m.children?.length) out.push(...flattenMacroMetrics(m.children));
  }
  return out;
}

export function sectionMetrics(section: MacroSectionPayload): MacroMetric[] {
  return flattenMacroMetrics(section.metrics);
}

export function metricsWithHistory(metrics: MacroMetric[], minPoints = 2): MacroMetric[] {
  return metrics.filter((m) => (m.history?.length ?? 0) >= minPoints && m.value != null);
}
