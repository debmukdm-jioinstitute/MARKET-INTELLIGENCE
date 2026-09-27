/** Open the floating Ask Deb panel from anywhere in the portal. */
export const OPEN_SITE_ASSISTANT_EVENT = "mi:open-site-assistant";

export function openSiteAssistant() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_SITE_ASSISTANT_EVENT));
}
