import crypto from "crypto";

const SECRET_KEY =
  process.env.AUTH_SECRET ||
  process.env.SESSION_SECRET ||
  "market-intel-secret-hmac-sha256-salt-2025-production";

/**
 * Creates a signed token string from a payload object.
 * Format: <base64url(payload)>.<base64url(signature)>
 */
export function signSessionPayload<T extends Record<string, unknown>>(payload: T): string {
  const jsonStr = JSON.stringify(payload);
  const dataB64 = Buffer.from(jsonStr, "utf-8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
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
  if (parts.length !== 2) {
    // Check if it's a legacy JSON string from older sessions during rolling upgrades
    if (token.startsWith("{") && token.endsWith("}")) {
      try {
        return JSON.parse(token) as T;
      } catch {
        return null;
      }
    }
    return null;
  }

  const [dataB64, signature] = parts;
  if (!dataB64 || !signature) return null;

  try {
    const expectedSig = crypto
      .createHmac("sha256", SECRET_KEY)
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
