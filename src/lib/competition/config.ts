export const STARTING_CAPITAL = 1_000_000;
export const POSITION_CAP = 0.25;
export const MIN_SYMBOLS = 5;
// Simplified per-side brokerage + STT allowance, deliberately not a broker tax calculation.
export const FRICTION_RATE = 0.0012;
export const DISCLAIMER =
  "Virtual money. Educational purpose only. Not investment advice. Research summaries are not buy/sell recommendations.";
export const TERMS_VERSION = "alpha-league-v1";
export const friction = (gross: number) =>
  Math.ceil(gross * FRICTION_RATE * 100) / 100;
export const istDay = (value: string | number | Date) =>
  new Date(new Date(value).getTime() + 19_800_000).toISOString().slice(0, 10);
export const marketOpen = (day: string) => `${day}T03:45:00.000Z`;
export const marketClose = (day: string) => `${day}T10:00:00.000Z`;
export function instituteDomains(): string[] {
  return (process.env.COMPETITION_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}
export function allowedEmail(email: string): boolean {
  const domains = instituteDomains();
  return (
    domains.length > 0 && domains.includes(email.toLowerCase().split("@")[1])
  );
}
export function blocklist(): string[] {
  return (process.env.COMPETITION_BLOCKLIST ?? "")
    .split(",")
    .map((x) => x.trim().toUpperCase().replace(/\.NS$/, ""))
    .filter(Boolean);
}
export function minTurnover(): number {
  const n = Number(process.env.COMPETITION_MIN_MEDIAN_TURNOVER ?? 10_000_000);
  return Number.isFinite(n) && n > 0 ? n : 10_000_000;
}
