/**
 * One rule for the whole site: negative numbers are RED, positive numbers are GREEN,
 * zero / unknown is neutral. Every formatter in the app emits a true minus sign
 * (U+2212, see formatPct) — so sign checks must never test for an ASCII "-" alone.
 */

export type SignTone = "up" | "down" | "flat";

const MINUS = /^[\s(]*[-−–]/; // hyphen-minus, true minus, en dash
const PLUS = /^[\s(]*\+/;
const NUM = /\d[\d,]*(?:\.\d+)?/;

/** Tone of a number, or of the first number in a formatted string ("−0.88%", "+₹1,200 Cr", "(−3.1%)"). */
export function signTone(v: number | string | null | undefined): SignTone {
  if (v === null || v === undefined) return "flat";
  if (typeof v === "number") return !Number.isFinite(v) || v === 0 ? "flat" : v > 0 ? "up" : "down";
  const s = v.trim();
  const m = NUM.exec(s);
  if (!m) return "flat";
  const n = Number(m[0].replace(/,/g, ""));
  if (n === 0) return "flat"; // "0.00%" is neither up nor down
  if (MINUS.test(s) || MINUS.test(s.slice(0, m.index).replace(/[^\d\-−–+().\s]/g, ""))) return "down";
  if (PLUS.test(s) || s.slice(0, m.index).includes("+")) return "up";
  return "up"; // an unsigned non-zero change is a gain
}

/** Tailwind classes for the portal (light theme only). */
export const SIGN_CLASS: Record<SignTone, string> = {
  up: "text-emerald-600",
  down: "text-rose-600",
  flat: "text-muted-foreground",
};
export const signClass = (v: number | string | null | undefined) => SIGN_CLASS[signTone(v)];

/** Hex palette used by the marketing/landing pages (they do not use theme tokens). */
export const LANDING_SIGN_CLASS: Record<SignTone, string> = {
  up: "text-[#0d6b5c]",
  down: "text-[#9b2c2c]",
  flat: "text-[#6b6b6b]",
};
export const landingSignClass = (v: number | string | null | undefined) => LANDING_SIGN_CLASS[signTone(v)];

/**
 * Splits free text into plain runs and EXPLICITLY signed numbers ("−9,484 Cr", "+10042 Cr", "(−0.88%)").
 * Unsigned numbers, dates ("2026-10-03") and ranges ("10-20") are never touched.
 */
const TOKEN_SRC = String.raw`((?<![\d\w.])[+\-\u2212\u2013]\s?[₹$]?\d[\d,]*(?:\.\d+)?\s?(?:%|bps|pp|Cr|cr|L|Lakh|k|K|M|B|x)?)`;
export function splitSigned(text: string): { text: string; tone: SignTone }[] {
  const isToken = new RegExp(`^${TOKEN_SRC}$`);
  return text
    .split(new RegExp(TOKEN_SRC, "g"))
    .filter((p) => p !== "")
    .map((p) => ({ text: p, tone: isToken.test(p) ? signTone(p) : "flat" }));
}
