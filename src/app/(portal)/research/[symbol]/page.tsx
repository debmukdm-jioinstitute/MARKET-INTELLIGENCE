import { cacheGetManyJson } from "@/lib/cache/redis";
import type { ResearchDetailPayload } from "@/lib/feeds/research-detail";
import { dossierCacheKey, panelCacheKey, researchPanelUrls } from "@/lib/research/panel-cache";
import { ResearchSymbolClient } from "./research-symbol-client";

/**
 * Server shell: reads the last cached dossier + panel payloads from Redis (one MGET,
 * <= 800 ms timeout) so the first HTML already contains data. Never calls upstreams.
 * On a cache miss everything behaves exactly like before (client fetches).
 */
export default async function ResearchSymbolPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const sym = decodeURIComponent(symbol).trim().toUpperCase();
  const panelUrls = researchPanelUrls(sym);
  const keys = [dossierCacheKey(sym), ...panelUrls.map((p) => panelCacheKey(p.name, sym))];
  const rows = await cacheGetManyJson<unknown>(keys);
  const dossier = rows[0] as { value: ResearchDetailPayload; ageMs: number } | null;
  const initialPanels: Record<string, unknown> = {};
  panelUrls.forEach((p, i) => {
    const row = rows[i + 1];
    if (row) initialPanels[p.url] = row.value;
  });
  return (
    <ResearchSymbolClient
      key={sym}
      initialData={dossier?.value ?? null}
      initialAgeMs={dossier?.ageMs ?? null}
      initialPanels={initialPanels}
    />
  );
}
