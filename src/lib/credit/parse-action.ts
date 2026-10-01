import type { CreditEventAction } from "@/lib/credit/types";

export function inferCreditActionFromTitle(title: string): CreditEventAction | "RATING_ACTION" {
  const t = title.toLowerCase();
  if (/\bdefault(ed)?\b/.test(t)) return "DEFAULT";
  if (/\brestructur/.test(t)) return "DEBT_RESTRUCTURING";
  if (/\bdowngrad/.test(t) || /\blowered\b/.test(t)) return "RATING_DOWNGRADE";
  if (/\bupgrad/.test(t) || /\braised\b/.test(t)) return "RATING_UPGRADE";
  if (/\boutlook\b/.test(t) || /\brevis(ed|ing)\b/.test(t)) return "OUTLOOK_CHANGE";
  if (/\bwatch\b|under review|reaffirm/.test(t)) return "CREDIT_WATCH";
  if (/\bliquidity\b/.test(t)) return "LIQUIDITY_CONCERN";
  return "RATING_ACTION";
}

export function creditActionLabel(action: CreditEventAction | "RATING_ACTION"): string {
  switch (action) {
    case "RATING_UPGRADE":
      return "Upgrade";
    case "RATING_DOWNGRADE":
      return "Downgrade";
    case "OUTLOOK_CHANGE":
      return "Outlook";
    case "CREDIT_WATCH":
      return "Watch / review";
    case "DEFAULT":
      return "Default";
    case "DEBT_RESTRUCTURING":
      return "Restructuring";
    case "LIQUIDITY_CONCERN":
      return "Liquidity";
    default:
      return "Rating action";
  }
}

/** Best-effort company name from agency headline text. */
export function inferCompanyNameFromTitle(title: string): string | null {
  const cleaned = title
    .replace(/\s*[-–|]\s*(CRISIL|ICRA|CARE|India Ratings|Acuité|Brickwork).*$/i, "")
    .replace(/\s*[-–|]\s*(rating rationale|press release|rating action|ratings?)\b.*$/gi, "")
    .replace(/\b(rating rationale|press release|rating action|ratings?)\b/gi, "")
    .replace(/[-–|]\s*$/g, "")
    .trim();
  if (cleaned.length < 3 || cleaned.length > 120) return null;
  return cleaned;
}
