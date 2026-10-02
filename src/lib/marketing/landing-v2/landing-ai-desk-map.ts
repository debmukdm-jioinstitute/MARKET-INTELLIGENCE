import type { TradingDeskResult } from "@/lib/ai/trading-desk";

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
