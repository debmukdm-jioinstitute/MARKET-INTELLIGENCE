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
