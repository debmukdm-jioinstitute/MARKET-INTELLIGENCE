import crypto from "crypto";

const DEV_FALLBACK_SECRET = "dev-only-insecure-secret-do-not-use-in-production";

/** Resolved lazily so `next build` never needs it. In production a missing secret is a hard error — no forgeable default. */
function secretKey(): string {
  const secret = process.env.AUTH_SECRET || process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET (or SESSION_SECRET) must be set in production");
  }
  return DEV_FALLBACK_SECRET;
}

/**
 * Creates a signed token string from a payload object.
 * Format: <base64url(payload)>.<base64url(signature)>
 */
export function signSessionPayload<T extends Record<string, unknown>>(payload: T): string {
  const jsonStr = JSON.stringify(payload);
  const dataB64 = Buffer.from(jsonStr, "utf-8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", secretKey())
    .update(dataB64)
    .digest("base64url");

  return `${dataB64}.${signature}`;
}

/**
 * Verifies and decodes a signed session token.
 * Returns null if the token is invalid, malformed, or has an invalid signature.
 */
export function verifySessionToken<T extends Record<string, unknown>>(token: string): T | null {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  // Unsigned (legacy JSON) tokens are never accepted: they would let anyone forge a session, including role=admin.
  if (parts.length !== 2) return null;

  const [dataB64, signature] = parts;
  if (!dataB64 || !signature) return null;

  try {
    const expectedSig = crypto
      .createHmac("sha256", secretKey())
      .update(dataB64)
      .digest("base64url");

    const expectedBuf = Buffer.from(expectedSig, "utf-8");
    const actualBuf = Buffer.from(signature, "utf-8");

    if (expectedBuf.length !== actualBuf.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(expectedBuf, actualBuf)) {
      return null;
    }

    const jsonStr = Buffer.from(dataB64, "base64url").toString("utf-8");
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}
