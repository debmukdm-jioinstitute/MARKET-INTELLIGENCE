/**
 * Customer email copy policy: NO em dashes (U+2014, &mdash;, &#8212;) in anything sent to a customer.
 * See docs/EMAIL_STYLE.md. Every send path in src/lib/admin/email.ts runs through these helpers,
 * so a stray dash in a template can never reach an inbox.
 */

const EM_DASH = "(?:\\u2014|&mdash;|&#8212;|&#x2014;)";
const SIGNOFF = new RegExp(`(^|>|\\n)(\\s*)${EM_DASH}\\s*(?=\\S)`, "g"); // "— Debabrata" -> "Debabrata"
const LONE = new RegExp(`(^|>|\\n)(\\s*)${EM_DASH}(\\s*)(?=<|\\n|$)`, "g"); // bare "—" separator line
const SPACED = new RegExp(`\\s*${EM_DASH}\\s*`, "g"); // "a — b" -> "a, b"

export function stripEmDashes(input: string): string {
  if (!input) return input;
  return input
    .replace(LONE, "$1$2$3")
    .replace(SIGNOFF, "$1$2")
    .replace(SPACED, ", ");
}

export function stripEmDashesOpt(input?: string): string | undefined {
  return input === undefined ? undefined : stripEmDashes(input);
}
