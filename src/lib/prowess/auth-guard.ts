import { ProwessError } from "./client";

let authBlockedUntil = 0;

const AUTH_RE = /authentication failure|no valid subscription|invalid api|apikey|api key/i;

export function isProwessAuthErrorMessage(message: string): boolean {
  return AUTH_RE.test(message);
}

export function isProwessAuthError(e: unknown): boolean {
  if (e instanceof ProwessError) return isProwessAuthErrorMessage(e.message);
  if (e instanceof Error) return isProwessAuthErrorMessage(e.message);
  return false;
}

/** After a global auth/subscription failure, skip live API calls for a cooldown (per server instance). */
export function isProwessLiveBlocked(): boolean {
  return Date.now() < authBlockedUntil;
}

export function blockProwessLive(ms = 60 * 60 * 1000): void {
  authBlockedUntil = Date.now() + ms;
}
