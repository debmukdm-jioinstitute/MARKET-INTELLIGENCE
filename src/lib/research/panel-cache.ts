/**
 * Redis keys shared by the research API routes (writers) and the server-rendered
 * research page (reader). The URLs MUST match the SWR keys used by the panels in
 * src/components/research/*-panel.tsx exactly, or the SWR fallback is ignored.
 */
export type ResearchPanelName =
  | "leadership"
  | "financials"
  | "ownership"
  | "announcements"
  | "ratings"
  | "concall"
  | "security-risk";

export const dossierCacheKey = (sym: string) => `dossier:v1:${sym}`;
export const panelCacheKey = (name: ResearchPanelName, sym: string) =>
  name === "ratings" ? `panel:v2:${name}:${sym}` : `panel:v1:${name}:${sym}`;

export function researchPanelUrls(sym: string): { name: ResearchPanelName; url: string }[] {
  const s = encodeURIComponent(sym);
  return [
    { name: "leadership", url: `/api/research/leadership?symbol=${s}` },
    { name: "financials", url: `/api/research/financials?symbol=${s}` },
    { name: "ownership", url: `/api/research/ownership?symbol=${s}&v=3` },
    { name: "announcements", url: `/api/research/announcements?symbol=${s}&limit=25` },
    { name: "ratings", url: `/api/research/ratings?symbol=${s}&v=2` },
    { name: "concall", url: `/api/research/concall?symbol=${s}&market=IN` },
    { name: "security-risk", url: `/api/feeds/security-risk?symbol=${s}` },
  ];
}
