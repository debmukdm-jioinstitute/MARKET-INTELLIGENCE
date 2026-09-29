/** Open the floating Ask Deb panel from anywhere in the portal. */
export const OPEN_SITE_ASSISTANT_EVENT = "mi:open-site-assistant";

export type OpenSiteAssistantDetail = { query?: string };

/**
 * Open the panel, optionally asking `query` on the user's behalf as soon as
 * it's mounted — used by the unified search bar's "Ask Deb" fallback so a
 * natural-language question typed into the search pill gets an actual
 * answer, not just a link.
 */
export function openSiteAssistant(query?: string) {
  if (typeof window === "undefined") return;
  const detail: OpenSiteAssistantDetail | undefined = query ? { query } : undefined;
  window.dispatchEvent(new CustomEvent<OpenSiteAssistantDetail>(OPEN_SITE_ASSISTANT_EVENT, { detail }));
}
