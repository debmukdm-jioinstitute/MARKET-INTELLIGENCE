import type { FlowDirection, InstitutionalSignal } from "./types";

export type SignalInputs = {
  fiiToday: number | null;
  fiiM1: number | null;
  fiiYtd: number | null;
  diiToday: number | null;
  diiM1: number | null;
  mfNetCapitalCr: number;
  mfAccumulatingCount: number;
  mfTrimmingCount: number;
};

function dirFromDelta(
  value: number | null,
  upAbove: number,
  downBelow: number,
): FlowDirection {
  if (value == null || !Number.isFinite(value)) return "na";
  if (value >= upAbove) return "up";
  if (value <= downBelow) return "down";
  return "neutral";
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Composite −100…100: domestic absorption (DII + MF) vs FII cash selling. */
export function deriveSmartMoneyScore(input: SignalInputs): number {
  const diiM1 = input.diiM1 ?? 0;
  const fiiM1 = input.fiiM1 ?? 0;
  const mf = input.mfNetCapitalCr;

  const domestic = clamp(diiM1 / 8000, -1, 1) * 45 + clamp(mf / 2500, -1, 1) * 35;
  const fiiDrag = clamp(-fiiM1 / 8000, -1, 1) * 20;
  return Math.round(clamp(domestic + fiiDrag, -100, 100));
}

export function smartMoneyLabel(score: number): { label: string; summary: string } {
  if (score >= 25) {
    return {
      label: "Domestic absorption",
      summary: "DII and mutual-fund capital outweigh FII cash selling — smart money leaning India.",
    };
  }
  if (score <= -25) {
    return {
      label: "Foreign-led risk-off",
      summary: "FII cash outflows dominate; domestic buyers not fully offsetting.",
    };
  }
  return {
    label: "Mixed flows",
    summary: "FII, DII, and MF flows are balanced — no clear one-sided institutional trend.",
  };
}

export function deriveInstitutionalSignals(input: SignalInputs): InstitutionalSignal[] {
  const score = deriveSmartMoneyScore(input);
  const smartDir: FlowDirection =
    score >= 20 ? "up" : score <= -20 ? "down" : "neutral";

  const instOwnDir: FlowDirection =
    input.mfNetCapitalCr > 400 && input.mfAccumulatingCount > input.mfTrimmingCount
      ? "up"
      : input.mfNetCapitalCr < -400
        ? "down"
        : "neutral";

  const mfDir = dirFromDelta(input.mfNetCapitalCr, 150, -150);
  const fiiOwnDir = dirFromDelta(input.fiiM1, 800, -800);
  if (input.fiiYtd != null && input.fiiYtd < -12000) {
    // sustained FII selling → ownership drift down even if last month flat
  }

  let fiiDirection = fiiOwnDir;
  if (fiiDirection === "neutral" && input.fiiYtd != null && input.fiiYtd < -8000) {
    fiiDirection = "down";
  } else if (fiiDirection === "neutral" && input.fiiYtd != null && input.fiiYtd > 8000) {
    fiiDirection = "up";
  }

  return [
    {
      id: "smart_money_flow",
      label: "Smart Money Flow",
      direction: smartDir,
      headline: smartMoneyLabel(score).label,
      detail: smartMoneyLabel(score).summary,
      href: "/intelligence/institutional",
    },
    {
      id: "institutional_ownership",
      label: "Institutional ownership",
      direction: instOwnDir,
      headline:
        instOwnDir === "up"
          ? "Broad MF accumulation"
          : instOwnDir === "down"
            ? "Net institutional trimming"
            : "Flat institutional footprint",
      detail:
        instOwnDir === "up"
          ? `${input.mfAccumulatingCount} names saw net MF buying vs ${input.mfTrimmingCount} trimmed (AMFI portfolio cycle).`
          : instOwnDir === "down"
            ? "Cross-fund net capital flow is negative this disclosure cycle."
            : "Mutual-fund book changes net to roughly zero across the tracked universe.",
      href: "/funds?tab=accumulation",
    },
    {
      id: "promoter_ownership",
      label: "Promoter ownership",
      direction: "na",
      headline: "Shareholding pattern not live yet",
      detail:
        "Promoter % moves come from NSE/BSE quarterly shareholding pattern and company filings — wired as a planned feed (NSDL/CDSL beneficial ownership).",
      href: "https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern",
    },
    {
      id: "mf_ownership",
      label: "MF ownership",
      direction: mfDir,
      headline:
        mfDir === "up"
          ? "MF books adding risk"
          : mfDir === "down"
            ? "MF books de-risking"
            : "MF ownership stable",
      detail: `Net capital movement across tracked schemes: ₹${input.mfNetCapitalCr.toFixed(0)} cr (monthly portfolio disclosure).`,
      href: "/funds?tab=accumulation",
    },
    {
      id: "fii_ownership",
      label: "FII ownership",
      direction: fiiDirection,
      headline:
        fiiDirection === "down"
          ? "FII cash selling pressure"
          : fiiDirection === "up"
            ? "FII cash buying"
            : "FII flows two-sided",
      detail:
        input.fiiM1 != null
          ? `~22-session FII net cash: ₹${input.fiiM1.toLocaleString("en-IN")} cr (NSE FII/DII).`
          : "FII/DII history needs collector DB for rollups — today’s print still live from NSE.",
      href: "/markets/india",
    },
    {
      id: "insider_activity",
      label: "Insider transactions",
      direction: "na",
      headline: "Exchange disclosure desk",
      detail:
        "SAST, bulk/block, and insider trades publish on NSE/BSE corp pages — automated scrape blocked; US names still show SEC Form 4 on the research risk panel.",
      href: "https://www.nseindia.com/companies-listing/corporate-filings-insider-trading",
    },
  ];
}
