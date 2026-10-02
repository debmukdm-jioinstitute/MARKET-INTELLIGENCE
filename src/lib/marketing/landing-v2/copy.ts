export const LANDING_SECTIONS = [
  { id: "hero", label: "Hero" },
  { id: "proof", label: "Demo" },
  { id: "uses", label: "Uses" },
  { id: "ai-desk", label: "AI desk" },
  { id: "markets", label: "Markets" },
  { id: "portfolio", label: "Portfolio" },
  { id: "alerts", label: "Alerts" },
  { id: "trust", label: "Trust" },
  { id: "pricing", label: "Pricing" },
  { id: "founder", label: "Founder" },
] as const;

export const PROOF_TABS = [
  { symbol: "RELIANCE", label: "RELIANCE — Energy · Retail" },
  { symbol: "HDFCBANK", label: "HDFCBANK — Private bank" },
  { symbol: "TCS", label: "TCS — IT services" },
] as const;

export type ProofSymbol = (typeof PROOF_TABS)[number]["symbol"];

export const PROOF_BRIEF_BLOCKS: Record<
  ProofSymbol,
  { id: string; title: string; body: string; source: string }[]
> = {
  RELIANCE: [
    {
      id: "01",
      title: "WHAT CHANGED",
      body: "Price action and volume should be read against the index — check whether the move is broad or name-specific.",
      source: "NSE ·",
    },
    {
      id: "02",
      title: "WHAT TO CHECK",
      body: "Refining margins, retail traction, and capex timelines in the latest exchange filings.",
      source: "Company filings ·",
    },
    {
      id: "03",
      title: "RISK FLAG",
      body: "Crude and INR swings can move earnings faster than the headline index suggests.",
      source: "RBI · macro series",
    },
  ],
  HDFCBANK: [
    {
      id: "01",
      title: "WHAT CHANGED",
      body: "Bank stocks often lag index moves — compare price to Nifty Bank before calling a trend.",
      source: "NSE ·",
    },
    {
      id: "02",
      title: "WHAT TO CHECK",
      body: "Deposit growth, asset quality trends, and rate sensitivity in the last quarterly update.",
      source: "Company filings ·",
    },
    {
      id: "03",
      title: "RISK FLAG",
      body: "Policy rate shifts reprice NIM expectations quickly — watch RBI communication.",
      source: "RBI ·",
    },
  ],
  TCS: [
    {
      id: "01",
      title: "WHAT CHANGED",
      body: "IT names react to USD revenue and client demand signals — pair price with USD/INR.",
      source: "NSE ·",
    },
    {
      id: "02",
      title: "WHAT TO CHECK",
      body: "Deal wins, attrition, and margin commentary in the latest results deck.",
      source: "Company filings ·",
    },
    {
      id: "03",
      title: "RISK FLAG",
      body: "A strong rupee can compress reported INR revenue even when demand is stable.",
      source: "RBI · FX",
    },
  ],
};

export const AI_VIEWPOINTS = [
  {
    id: "fundamentals",
    short: "F",
    label: "Fundamentals — VIEW →",
    confidence: "68%",
    body: "The business is diversified, but the investment case depends on whether new projects turn spending into durable cash flow.",
    evidence: ["Quarterly results", "Cash-flow statement", "Segment disclosure"],
  },
  {
    id: "bull",
    short: "B+",
    label: "Bull case — VIEW →",
    confidence: "68%",
    body: "If execution holds, the newer businesses can widen the growth runway without relying on one engine.",
    evidence: ["Management guidance", "Capex plan", "Segment revenue mix"],
  },
  {
    id: "bear",
    short: "B−",
    label: "Bear case — VIEW →",
    confidence: "68%",
    body: "The market may already price in a smooth transition. Delays or weaker returns would leave little room for error.",
    evidence: ["Valuation vs history", "Execution track record", "Peer comparisons"],
  },
  {
    id: "sentiment",
    short: "S",
    label: "Sentiment — VIEW →",
    confidence: "68%",
    body: "The tone has improved, but headlines are moving faster than the underlying evidence.",
    evidence: ["News flow", "Analyst revisions", "Social mention trend"],
  },
  {
    id: "risk",
    short: "R",
    label: "Risk manager — VIEW →",
    confidence: "68%",
    body: "The case is balanced, not settled. Define the evidence that would change your mind before you act.",
    evidence: ["Position size", "Downside case", "Time horizon"],
    checklist: true,
  },
] as const;
