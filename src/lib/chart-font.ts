/**
 * Canvas charts (lightweight-charts) do not inherit CSS fonts and default to a system stack
 * (-apple-system, Trebuchet, Roboto). Pass the page's resolved font so charts also use Google Sans.
 * @see docs/TYPOGRAPHY.md
 */
export function chartFontFamily(): string {
  if (typeof window === "undefined") return "Google Sans, sans-serif";
  return getComputedStyle(document.body).fontFamily || "Google Sans, sans-serif";
}
