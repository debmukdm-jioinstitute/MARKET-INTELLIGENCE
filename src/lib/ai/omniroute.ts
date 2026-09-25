import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

const GROQ_BASE = "https://api.groq.com/openai/v1";
const DEFAULT_OMNI_MODEL = "auto/fast";
/** Second free Groq model (smaller/faster than gpt-oss-120b). Override with OMNROUTE_FALLBACK_MODEL. */
const DEFAULT_OMNI_FALLBACK_MODEL = "openai/gpt-oss-20b";
const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";

export class SiteAssistantConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SiteAssistantConfigError";
  }
}

export type SiteAssistantTier = {
  model: LanguageModel;
  /** Response header value for X-MI-Assistant-Provider */
  label: string;
};

export function hasOmniRoute(): boolean {
  return Boolean(process.env.OMNIROUTE_BASE_URL?.trim() && process.env.OMNIROUTE_API_KEY?.trim());
}

export function hasSiteAssistantLlm(): boolean {
  return hasOmniRoute() || Boolean(process.env.GROQ_API_KEY?.trim());
}

function createOmniRouteClient() {
  const omniBase = process.env.OMNIROUTE_BASE_URL?.trim();
  const omniKey = process.env.OMNIROUTE_API_KEY?.trim();
  if (!omniBase || !omniKey) return null;
  return createOpenAI({
    baseURL: omniBase.replace(/\/$/, ""),
    apiKey: omniKey,
    name: "omniroute",
  });
}

function createGroqClient() {
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (!groqKey) return null;
  return createOpenAI({
    baseURL: GROQ_BASE,
    apiKey: groqKey,
    name: "groq",
  });
}

/**
 * Ordered fallback tiers for the portal assistant.
 * 1) OmniRoute auto/fast (free-tier pool)
 * 2) OmniRoute → Groq with a different free model (Llama 3.3 70B)
 * 3) Direct Groq (bypass gateway if OmniRoute is down)
 */
export function getSiteAssistantModelTiers(): SiteAssistantTier[] {
  const tiers: SiteAssistantTier[] = [];
  const omni = createOmniRouteClient();
  if (omni) {
    const primary = process.env.OMNIROUTE_MODEL?.trim() || DEFAULT_OMNI_MODEL;
    tiers.push({ model: omni.chat(primary), label: "omniroute" });

    const fallbackModel = process.env.OMNIROUTE_FALLBACK_MODEL?.trim() || DEFAULT_OMNI_FALLBACK_MODEL;
    if (fallbackModel !== primary) {
      tiers.push({ model: omni.chat(fallbackModel), label: "omniroute-groq-fallback" });
    }
  }

  const groq = createGroqClient();
  if (groq) {
    const directModel = process.env.SITE_ASSISTANT_GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL;
    tiers.push({ model: groq.chat(directModel), label: "groq-direct" });
  }

  return tiers;
}

/** @deprecated Use getSiteAssistantModelTiers + selectSiteAssistantTier */
export function getSiteAssistantModel(): LanguageModel {
  const tiers = getSiteAssistantModelTiers();
  if (tiers.length === 0) {
    throw new SiteAssistantConfigError(
      "Site assistant needs OMNROUTE_BASE_URL + OMNROUTE_API_KEY, or GROQ_API_KEY. See docs/OMNIROUTE.md.",
    );
  }
  return tiers[0].model;
}

export function siteAssistantProviderLabel(): "omniroute" | "groq" {
  return hasOmniRoute() ? "omniroute" : "groq";
}
