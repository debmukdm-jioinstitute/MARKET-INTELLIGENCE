/**
 * Best-effort visitor IP for rate limiting and audit logging.
 *
 * Trust order:
 * 1. `CF-Connecting-IP` — set by Cloudflare's edge and overwritten on every
 *    proxied request, so a client cannot spoof it. Since the site is fully
 *    behind Cloudflare (2026-10-04), this is the true visitor IP in
 *    production. Trusting it closes the X-Forwarded-For spoofing hole, where
 *    a client could prepend an arbitrary IP before the proxy appended the
 *    real one and thereby rotate rate-limit keys at will.
 * 2. Leftmost `X-Forwarded-For` — fallback for direct-to-origin traffic
 *    (local dev, Vercel previews, health checks) where Cloudflare is absent.
 * 3. `X-Real-IP` — second fallback.
 * 4. `fallback` — when nothing is present ("anon" by default; some callers
 *    keep "unknown" to preserve their existing sentinel).
 */
export function clientIp(req: Request, fallback = "anon"): string {
  return (
    req.headers.get("cf-connecting-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    fallback
  );
}
