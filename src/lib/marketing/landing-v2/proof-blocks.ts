import type { ResearchDetailPayload } from "@/lib/feeds/research-detail";

export type ProofBlock = { id: string; title: string; body: string; source: string };

export function buildProofBlocks(payload: ResearchDetailPayload | null | undefined): ProofBlock[] {
  if (!payload) {
    return [
      blankBlock("01", "WHAT CHANGED"),
      blankBlock("02", "WHAT TO CHECK"),
      blankBlock("03", "RISK FLAG"),
    ];
  }

  const q = payload.upstoxQuote;
  const intel = payload.intelligence;
  const pct =
    q && q.ohlc.close
      ? ((q.ltp - q.ohlc.close) / q.ohlc.close) * 100
      : q?.netChange && q.ltp
        ? (q.netChange / (q.ltp - q.netChange)) * 100
        : null;
  const chStr = pct != null && Number.isFinite(pct) ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}% today` : "";

  const whatChanged =
    intel.newsSummary.headline ||
    (chStr ? `${payload.symbol} ${chStr} — news tone ${intel.newsSummary.overall}.` : intel.newsSummary.overall);

  const topNews = intel.newsFeed[0];
  const corp = intel.corporateActions[0];
  const whatCheck =
    corp?.subject ||
    topNews?.title ||
    (() => {
      const pe = payload.fundamentals?.ratios.find((r) => /p\/e|pe ratio/i.test(r.name));
      return pe?.companyValue != null ? `${pe.name} ${pe.companyValue.toFixed(1)}${pe.unitSuffix} (sector ${pe.sectorValue ?? "—"})` : "";
    })();

  const neg = intel.newsFeed.find((n) => n.impact === "negative");
  const risk =
    neg?.rationale ||
    neg?.title ||
    (intel.corporateActions.length ? `Track ${intel.corporateActions.length} corporate action(s) on the exchange feed.` : "");

  const quoteSource = payload.sources.find((s) => s.id === "upstox-quote")?.label ?? "Upstox";
  const newsSource = topNews?.sourceLabel ?? "News feeds";

  return [
    { id: "01", title: "WHAT CHANGED", body: whatChanged, source: `${quoteSource} · ${newsSource}` },
    { id: "02", title: "WHAT TO CHECK", body: whatCheck, source: corp ? "NSE corporate actions" : newsSource },
    { id: "03", title: "RISK FLAG", body: risk, source: neg?.sourceLabel ?? quoteSource },
  ];
}

function blankBlock(id: string, title: string): ProofBlock {
  return { id, title, body: "", source: "" };
}
