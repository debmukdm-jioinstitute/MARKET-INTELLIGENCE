import {
  SiteAssistantConfigError,
  getSiteAssistantModelTiers,
  type SiteAssistantTier,
} from "@/lib/ai/omniroute";
import { generateText } from "ai";

const PROBE_PROMPT = "Reply with exactly: ok";

/** Stop the chain only on auth/config errors that the next tier cannot fix. */
function shouldStopTierChain(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("invalid_api_key") || (msg.includes("401") && !msg.includes("429"));
}

/**
 * Picks the first LLM tier that responds (lightweight probe, no tools).
 * Avoids streaming a full assistant turn against a dead free-tier pool.
 */
export async function selectSiteAssistantTier(system: string): Promise<SiteAssistantTier> {
  const tiers = getSiteAssistantModelTiers();
  if (tiers.length === 0) {
    throw new SiteAssistantConfigError(
      "Site assistant needs OMNROUTE_BASE_URL + OMNROUTE_API_KEY, or GROQ_API_KEY. See docs/OMNIROUTE.md.",
    );
  }

  let lastError: unknown;
  for (const tier of tiers) {
    try {
      await generateText({
        model: tier.model,
        system,
        prompt: PROBE_PROMPT,
        maxOutputTokens: 24,
      });
      return tier;
    } catch (e) {
      lastError = e;
      if (shouldStopTierChain(e)) break;
      console.warn("[site-assistant] tier probe failed:", tier.label, e instanceof Error ? e.message : e);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new SiteAssistantConfigError("All assistant model tiers are unavailable.");
}
