import crypto from "crypto";
import { signSessionPayload, verifySessionToken } from "@/lib/auth-crypto";

const TTL_MS = 60 * 60 * 1000;

type ResetPayload = { t: "pwreset"; e: string; f: string; x: number };

/** Fingerprint of the current hash: changing the password invalidates every outstanding link (single use). */
function fingerprint(passwordHash: string): string {
  return crypto.createHash("sha256").update(passwordHash).digest("hex").slice(0, 24);
}

export function createResetToken(email: string, passwordHash: string): string {
  return signSessionPayload<ResetPayload>({ t: "pwreset", e: email, f: fingerprint(passwordHash), x: Date.now() + TTL_MS });
}

export function readResetToken(token: string): { email: string; fingerprint: string } | null {
  const p = verifySessionToken<ResetPayload>(token);
  if (!p || p.t !== "pwreset" || typeof p.e !== "string" || typeof p.x !== "number" || p.x < Date.now()) return null;
  return { email: p.e, fingerprint: p.f };
}

export function matchesFingerprint(passwordHash: string, fp: string): boolean {
  const a = Buffer.from(fingerprint(passwordHash));
  const b = Buffer.from(fp);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
