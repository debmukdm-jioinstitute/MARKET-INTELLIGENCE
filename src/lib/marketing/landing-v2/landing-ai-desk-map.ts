import type { TradingDeskResult } from "@/lib/ai/trading-desk";
import type { ResearchDetailPayload } from "@/lib/feeds/research-detail";

export type LandingViewpointId = "fundamentals" | "bull" | "bear" | "sentiment" | "risk";

export type LandingViewpoint = {
  id: LandingViewpointId;
  label: string;
  confidence: string;
  body: string;
  evidence: string[];
};

const LABELS: Record<LandingViewpointId, string> = {
  fundamentals: "Fundamentals — VIEW →",
  bull: "Bull case — VIEW →",
  bear: "Bear case — VIEW →",
  sentiment: "Sentiment — VIEW →",
  risk: "Risk manager — VIEW →",
};

export function mapTradingDeskToViewpoints(desk: TradingDeskResult | null | undefined): LandingViewpoint[] {
  const ids: LandingViewpointId[] = ["fundamentals", "sentiment", "bull", "bear", "risk"];
  if (!desk) {
    return ids.map((id) => ({
      id,
      label: LABELS[id],
      confidence: "—",
      body: "",
      evidence: [],
    }));
  }

  const fundamental = desk.analysts.find((a) => a.role === "Fundamental Analyst");
  const sentiment = desk.analysts.find((a) => a.role === "Sentiment Analyst");
  const bull = desk.debate.find((d) => d.role === "Bull Researcher");
  const bear = desk.debate.find((d) => d.role === "Bear Researcher");

  const byId: Record<LandingViewpointId, LandingViewpoint> = {
    fundamentals: {
      id: "fundamentals",
      label: LABELS.fundamentals,
      confidence: pct(fundamental?.confidence),
      body: joinPoints(fundamental?.keyPoints) || fundamental?.dataNote || "",
      evidence: fundamental?.keyPoints?.slice(0, 3) ?? [],
    },
    sentiment: {
      id: "sentiment",
      label: LABELS.sentiment,
      confidence: pct(sentiment?.confidence),
      body: joinPoints(sentiment?.keyPoints) || `${desk.headlineCount} headlines in run.`,
      evidence: sentiment?.keyPoints?.slice(0, 3) ?? ["News flow"],
    },
    bull: {
      id: "bull",
      label: LABELS.bull,
      confidence: pct(desk.trader.confidence),
      body: bull?.thesis || "",
      evidence: bull?.keyPoints?.slice(0, 3) ?? [],
    },
    bear: {
      id: "bear",
      label: LABELS.bear,
      confidence: pct(desk.trader.confidence),
      body: bear?.thesis || "",
      evidence: bear?.keyPoints?.slice(0, 3) ?? [],
    },
    risk: {
      id: "risk",
      label: LABELS.risk,
      confidence: pct(desk.risk.approved ? desk.trader.confidence : desk.trader.confidence * 0.85),
      body: desk.risk.rationale || "",
      evidence: [
        desk.risk.finalAction,
        desk.risk.maxPositionPct != null ? `Max size ${desk.risk.maxPositionPct}%` : "",
        desk.risk.stopLossPct != null ? `Stop ${desk.risk.stopLossPct}%` : "",
      ].filter(Boolean),
    },
  };

  return ids.map((id) => byId[id]);
}

function pct(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

function joinPoints(points: string[] | undefined): string {
  if (!points?.length) return "";
  return points.slice(0, 2).join(" ");
}

/** Non-LLM fallback from live research feeds (news, filings, ratios). */
export function mapResearchToViewpoints(research: ResearchDetailPayload | null | undefined): LandingViewpoint[] {
  const ids: LandingViewpointId[] = ["fundamentals", "sentiment", "bull", "bear", "risk"];
  if (!research) {
    return mapTradingDeskToViewpoints(null);
  }

  const intel = research.intelligence;
  const pe = research.fundamentals?.ratios.find((r) => /p\/e|pe ratio/i.test(r.name));
  const pos = intel.newsFeed.filter((n) => n.impact === "positive").length;
  const neg = intel.newsFeed.filter((n) => n.impact === "negative").length;
  const sentimentScore =
    intel.newsSummary.score != null && Number.isFinite(intel.newsSummary.score)
      ? `${Math.min(100, Math.max(0, Math.round(50 + intel.newsSummary.score * 10)))}%`
      : "—";

  const fundamentalsBody = pe?.companyValue != null
    ? `${pe.name} ${pe.companyValue.toFixed(1)}${pe.unitSuffix}; sector ${pe.sectorValue ?? "—"}${pe.unitSuffix}.`
    : research.fundamentals?.ratios[0]?.name
      ? `${research.fundamentals.ratios[0].name} on file — open research for full ratios.`
      : intel.newsSummary.headline;

  const byId: Record<LandingViewpointId, LandingViewpoint> = {
    fundamentals: {
      id: "fundamentals",
      label: LABELS.fundamentals,
      confidence: "—",
      body: fundamentalsBody,
      evidence: (research.fundamentals?.ratios ?? []).slice(0, 3).map((r) => r.name),
    },
    sentiment: {
      id: "sentiment",
      label: LABELS.sentiment,
      confidence: sentimentScore,
      body: intel.newsSummary.headline || `News tone: ${intel.newsSummary.overall}.`,
      evidence: intel.newsFeed.slice(0, 3).map((n) => n.title.slice(0, 48)),
    },
    bull: {
      id: "bull",
      label: LABELS.bull,
      confidence: pos > neg ? "55%" : "—",
      body:
        intel.newsFeed.find((n) => n.impact === "positive")?.rationale ||
        intel.newsFeed.find((n) => n.impact === "positive")?.title ||
        "",
      evidence: ["News flow", "Price vs index"],
    },
    bear: {
      id: "bear",
      label: LABELS.bear,
      confidence: neg > pos ? "55%" : "—",
      body:
        intel.newsFeed.find((n) => n.impact === "negative")?.rationale ||
        intel.newsFeed.find((n) => n.impact === "negative")?.title ||
        "",
      evidence: ["Risk headlines", "Corporate actions"],
    },
    risk: {
      id: "risk",
      label: LABELS.risk,
      confidence: "—",
      body:
        intel.corporateActions[0]?.subject ||
        "Define what would change your read — use filings and macro links before sizing.",
      evidence: [
        intel.corporateActions.length ? `${intel.corporateActions.length} corp action(s)` : "",
        `${intel.newsFeed.length} headlines scored`,
      ].filter(Boolean),
    },
  };

  return ids.map((id) => byId[id]);
}

export function mergeLandingViewpoints(
  desk: TradingDeskResult | null | undefined,
  research: ResearchDetailPayload | null | undefined,
): LandingViewpoint[] {
  const fromDesk = mapTradingDeskToViewpoints(desk);
  if (desk) return fromDesk;
  return mapResearchToViewpoints(research);
}
