import type { PromoterActivityType } from "@/lib/promoters/types";
import type { PromoterFeedCategory } from "@/lib/promoters/feed-types";

const SYMBOL_RE = /\b([A-Z]{2,12})\b/;

export function inferPromoterCategory(title: string): PromoterFeedCategory {
  const t = title.toLowerCase();
  if (/\bblock deal\b/.test(t)) return "BLOCK_DEAL";
  if (/\bbulk deal\b/.test(t)) return "BULK_DEAL";
  if (/\bpledge\b/.test(t)) {
    if (/\brelease\b|\brevoke\b|\breduc/.test(t)) return "PLEDGE_DECREASE";
    return "PLEDGE_INCREASE";
  }
  if (/\binsider\b/.test(t)) {
    if (/\bsell\b|\bselling\b|\bdispos/.test(t)) return "INSIDER_SELLING";
    if (/\bbuy\b|\bbuying\b|\bacquir|\bpurchase\b/.test(t)) return "INSIDER_BUYING";
    return "DISCLOSURE";
  }
  if (/\bpromoter\b/.test(t)) {
    if (/\bbuy\b|\bacquir|\bpurchase\b|\binfusion\b/.test(t)) return "PROMOTER_BUYING";
    if (/\bsell\b|\bdispos|\bexit\b/.test(t)) return "PROMOTER_SELLING";
  }
  if (/\bsell\b|\bdispos|\bstake sale\b/.test(t)) return "PROMOTER_SELLING";
  if (/\bbuy\b|\bacquir|\bpurchase\b/.test(t)) return "PROMOTER_BUYING";
  if (/\bsast\b|\bshareholding\b|\blarge shareholder\b/.test(t)) return "LARGE_SHAREHOLDER_CHANGE";
  return "DISCLOSURE";
}

export function promoterCategoryLabel(category: PromoterFeedCategory): string {
  if (category === "DISCLOSURE") return "Disclosure";
  return category
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function inferSymbolFromTitle(title: string): string | null {
  const m = title.match(SYMBOL_RE);
  if (!m) return null;
  const sym = m[1]!;
  if (["NSE", "BSE", "SEBI", "SAST", "PIT", "INDIA", "OR", "THE"].includes(sym)) return null;
  return sym;
}

export function inferCompanyFromTitle(title: string): string | null {
  const cut = title.split(/\s[-–|:]\s/)[0]?.trim();
  if (!cut || cut.length < 3 || cut.length > 100) return null;
  return cut;
}
