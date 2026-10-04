export type CompetitionStatus = "draft" | "registration" | "live" | "ended";
export type Competition = {
  id: string;
  slug: string;
  name: string;
  startsAt: string;
  endsAt: string;
  startingCapital: number;
  status: CompetitionStatus;
  tradingDays: string[];
  revision: number;
  finalistCount: number;
  resultsVerified: boolean;
};
export type Trade = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  shares: number;
  price: number;
  grossValue: number;
  brokerage: number;
  tradedAt: string;
};
export type CorporateAction = {
  id: string;
  symbol: string;
  ratio: number;
  dividend: number;
  exDate: string;
};
export type Holdings = {
  cash: number;
  positions: Record<string, number>;
  symbolsTraded: string[];
  lastTradeAt: string | null;
};
export type Participant = {
  email: string;
  displayName: string;
  status: "active" | "disqualified";
  version: number;
};
export type Snapshot = { day: string; value: number };
export type BoardRow = {
  rank: number | null;
  displayName: string;
  returnPct: number | null;
  value: number | null;
  symbolsTraded: number;
  eligible: boolean;
  disqualified: boolean;
  sharpe: number | null;
  maxDrawdown: number | null;
  lastTradeAt: string | null;
  snapshots: number;
};
export type PriceMap = Record<string, number>;
export type OrderResult =
  { ok: true; tradeId: string } | { ok: false; error: string; status: number };
