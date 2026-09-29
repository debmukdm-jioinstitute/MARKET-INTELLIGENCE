/** Rule-based extraction from DRHP/RHP text (best-effort; no invented numbers). */

export type ProspectusExtract = {
  freshIssueCr: number | null;
  ofsCr: number | null;
  riskBullets: string[];
  objectBullets: string[];
  promoterSnippet: string | null;
  anchorSnippet: string | null;
  financialSnippet: string | null;
  valuationSnippet: string | null;
  peerSnippet: string | null;
  leadManagerSnippet: string | null;
};

function sliceSection(text: string, startRe: RegExp, maxLen = 4000): string {
  const m = startRe.exec(text);
  if (!m || m.index == null) return "";
  return text.slice(m.index, m.index + maxLen);
}

function bulletsFromBlock(block: string, max = 8): string[] {
  const lines = block
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 40 && s.length < 420);
  const out: string[] = [];
  for (const line of lines) {
    if (/^\d+\.?\s/.test(line) || /^[-•]/.test(line) || /may adversely|could result|risk/i.test(line)) {
      out.push(line.replace(/^\d+\.?\s*/, "").slice(0, 380));
    }
    if (out.length >= max) break;
  }
  if (out.length < 3) {
    for (const line of lines.slice(0, max)) {
      if (!out.includes(line)) out.push(line.slice(0, 380));
      if (out.length >= max) break;
    }
  }
  return out.slice(0, max);
}

function parseCrNear(labelRe: RegExp, text: string): number | null {
  const m = labelRe.exec(text);
  if (!m) return null;
  const window = text.slice(m.index, m.index + 220);
  const num = /(?:₹|Rs\.?\s*)?([\d,]+(?:\.\d+)?)\s*(?:crore|Cr|crores)/i.exec(window);
  if (!num) return null;
  const n = Number(num[1]!.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function parseProspectusText(text: string): ProspectusExtract {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length < 200) {
    return {
      freshIssueCr: null,
      ofsCr: null,
      riskBullets: [],
      objectBullets: [],
      promoterSnippet: null,
      anchorSnippet: null,
      financialSnippet: null,
      valuationSnippet: null,
      peerSnippet: null,
      leadManagerSnippet: null,
    };
  }

  const freshIssueCr =
    parseCrNear(/fresh\s+issue/i, normalized) ??
    parseCrNear(/issue\s+of\s+.*fresh/i, normalized);
  const ofsCr =
    parseCrNear(/offer\s+for\s+sale/i, normalized) ?? parseCrNear(/\bOFS\b/i, normalized);

  const riskBlock = sliceSection(
    normalized,
    /(?:KEY\s+)?RISK\s+FACTORS|RISKS\s+RELATING/i,
    6000,
  );
  const objectBlock = sliceSection(
    normalized,
    /OBJECTS?\s+OF\s+(?:THE\s+)?ISSUE|USE\s+OF\s+PROCEEDS/i,
    3500,
  );
  const promoterBlock = sliceSection(
    normalized,
    /OUR\s+PROMOTERS?|PROMOTER\s+AND\s+PROMOTER\s+GROUP/i,
    2500,
  );
  const anchorBlock = sliceSection(
    normalized,
    /ANCHOR\s+INVESTOR|QUALIFIED\s+INSTITUTIONAL\s+BUYERS/i,
    2000,
  );
  const finBlock = sliceSection(
    normalized,
    /SUMMARY\s+OF\s+FINANCIAL|FINANCIAL\s+INFORMATION|STATEMENT\s+OF\s+PROFIT/i,
    3500,
  );
  const valBlock = sliceSection(
    normalized,
    /BASIS\s+FOR\s+ISSUE\s+PRICE|PRICE\s+BAND|P\/E\s+RATIO|PRICE\s+TO\s+EARNINGS/i,
    2500,
  );
  const peerBlock = sliceSection(
    normalized,
    /INDUSTRY\s+OVERVIEW|PEER\s+COMPARISON|COMPARABLE\s+COMPANIES/i,
    2500,
  );
  const lmBlock = sliceSection(
    normalized,
    /BOOK\s+RUNNING\s+LEAD\s+MANAGER|BRLM|LEAD\s+MANAGER/i,
    1200,
  );

  return {
    freshIssueCr,
    ofsCr,
    riskBullets: bulletsFromBlock(riskBlock, 8),
    objectBullets: bulletsFromBlock(objectBlock, 6),
    promoterSnippet: promoterBlock ? promoterBlock.slice(0, 900) : null,
    anchorSnippet: anchorBlock ? anchorBlock.slice(0, 700) : null,
    financialSnippet: finBlock ? finBlock.slice(0, 900) : null,
    valuationSnippet: valBlock ? valBlock.slice(0, 700) : null,
    peerSnippet: peerBlock ? peerBlock.slice(0, 700) : null,
    leadManagerSnippet: lmBlock ? lmBlock.slice(0, 500) : null,
  };
}
