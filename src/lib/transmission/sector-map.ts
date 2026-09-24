import type { SectorId } from "./betas";

/** Maps a holding's free-text sector label to a modelled sector proxy; unmapped Indian holdings fall back to the market. */
export function sectorFor(label: string | null): SectorId {
  const s = (label ?? "").toLowerCase();
  if (/psu.*bank/.test(s)) return "psubank";
  if (/bank|financ/.test(s)) return "bank";
  if (/tech|software|\bit\b/.test(s)) return "it";
  if (/pharma/.test(s)) return "pharma";
  if (/health/.test(s)) return "healthcare";
  if (/auto/.test(s)) return "auto";
  if (/fmcg|staple|consumer def/.test(s)) return "fmcg";
  if (/metal|material|mining|steel/.test(s)) return "metal";
  if (/energy|oil|gas|petro/.test(s)) return "oilgas";
  if (/infra|industrial|capital goods|construction/.test(s)) return "infra";
  if (/real ?estate|realty/.test(s)) return "realty";
  return "nifty";
}
