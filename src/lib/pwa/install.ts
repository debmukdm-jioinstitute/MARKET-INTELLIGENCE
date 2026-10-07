export type InstallPlatform = "ios" | "android" | "other-mobile" | "desktop";

/** Pop-up appears 5 s after the first interaction, and never later than 10 s after the page mounts. */
export const SHOW_AFTER_INTERACTION_MS = 5_000;
export const SHOW_MAX_WAIT_MS = 10_000;

export function detectPlatform(ua: string, maxTouchPoints: number): InstallPlatform {
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  // iPadOS 13+ reports a Mac user agent but has a touch screen.
  if (/Macintosh/i.test(ua) && maxTouchPoints > 1) return "ios";
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) || maxTouchPoints > 0 ? "android" : "other-mobile";
  if (/Mobile|Opera Mini|IEMobile/i.test(ua)) return "other-mobile";
  return "desktop";
}

/** Milliseconds from `now` until the prompt should show. */
export function computeShowDelay(mountedAt: number, interactedAt: number | null, now: number): number {
  const deadline = mountedAt + SHOW_MAX_WAIT_MS;
  const target = interactedAt == null ? deadline : Math.min(interactedAt + SHOW_AFTER_INTERACTION_MS, deadline);
  return Math.max(0, target - now);
}
