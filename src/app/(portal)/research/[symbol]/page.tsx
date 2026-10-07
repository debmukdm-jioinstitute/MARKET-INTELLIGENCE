import { after } from "next/server";
import { cacheGetManyJson, cacheSetJson, hasRedis } from "@/lib/cache/redis";
import { buildResearchDetail, type ResearchDetailPayload } from "@/lib/feeds/research-detail";
import { dossierCacheKey, panelCacheKey, researchPanelUrls } from "@/lib/research/panel-cache";
import { ResearchSymbolClient } from "./research-symbol-client";

/** Longest the server waits for a live dossier on a cache miss before streaming the client shell. */
const SSR_FALLBACK_TIMEOUT_MS = 1_500;

function settleWithin<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

/**
 * Server shell: reads the last cached dossier + panel payloads from Redis (one MGET,
 * <= 800 ms timeout) so the first HTML already contains data. On a dossier cache miss
 * (or Redis off) it builds the dossier live, waiting at most SSR_FALLBACK_TIMEOUT_MS;
 * when that also misses, the page behaves exactly like before (client fetches).
 * A live build is written back to Redis after the response, so the next visitor hits cache.
 */
export default async function ResearchSymbolPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const sym = decodeURIComponent(symbol).trim().toUpperCase();
  const panelUrls = researchPanelUrls(sym);
  const keys = [dossierCacheKey(sym), ...panelUrls.map((p) => panelCacheKey(p.name, sym))];
  const rows = await cacheGetManyJson<unknown>(keys);
  const cached = rows[0] as { value: ResearchDetailPayload; ageMs: number } | null;
  const initialPanels: Record<string, unknown> = {};
  panelUrls.forEach((p, i) => {
    const row = rows[i + 1];
    if (row) initialPanels[p.url] = row.value;
  });

  let initialData: ResearchDetailPayload | null = cached?.value ?? null;
  let initialAgeMs: number | null = cached?.ageMs ?? null;
  if (!initialData && /^[A-Z0-9&.\-]{1,20}$/.test(sym)) {
    const live = buildResearchDetail(sym).catch(() => null);
    initialData = await settleWithin(live, SSR_FALLBACK_TIMEOUT_MS);
    if (initialData) initialAgeMs = 0;
    if (hasRedis()) {
      // Even when we timed out above, finish the build in the background and cache it.
      after(async () => {
        const full = await live;
        if (full) await cacheSetJson(dossierCacheKey(sym), full, 15 * 60);
      });
    }
  }

  return (
    <ResearchSymbolClient
      key={sym}
      initialData={initialData}
      initialAgeMs={initialAgeMs}
      initialPanels={initialPanels}
    />
  );
}
