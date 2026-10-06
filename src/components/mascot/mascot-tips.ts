export type MascotTip = {
  text: string;
  /** Gesture the owl performs while delivering the tip. */
  gesture: "wave" | "point" | "inspect" | "cheer";
  cta?: { label: string; href: string };
};

/** Landing page: keyed by section id. */
export const LANDING_TIPS: Record<string, MascotTip> = {
  hero: {
    text: "Hi, I'm Mi. Search any NSE or BSE stock and I'll pull up the research for you.",
    gesture: "wave",
    cta: { label: "Try a search", href: "/research" },
  },
  proof: {
    text: "These are live research pages, not screenshots. Every number links to its source.",
    gesture: "inspect",
  },
  uses: {
    text: "Pick the job you want done. Each card opens the exact tool for it.",
    gesture: "point",
  },
  "ai-desk": {
    text: "Ask the AI desk in plain English. It answers from the same data you see on the page.",
    gesture: "point",
  },
  markets: {
    text: "Live board for indices, movers and breadth. It refreshes while you watch.",
    gesture: "inspect",
    cta: { label: "Open markets", href: "/markets/india" },
  },
  portfolio: {
    text: "Import your holdings and see risk, tax and overlap in one place.",
    gesture: "point",
    cta: { label: "Open portfolio", href: "/portfolio" },
  },
  alerts: {
    text: "Set an alert once. I'll keep an eye on it so you don't have to.",
    gesture: "point",
  },
  macro: {
    text: "Rates, inflation and flows drive stocks. This is the macro view.",
    gesture: "inspect",
    cta: { label: "Open macro", href: "/macro" },
  },
  trust: {
    text: "Descriptive data only, never investment advice. Sources and methods are public.",
    gesture: "inspect",
    cta: { label: "Read methodology", href: "/methodology" },
  },
  pricing: {
    text: "Start free. Upgrade only when you need more.",
    gesture: "point",
    cta: { label: "See plans", href: "/pricing" },
  },
  founder: {
    text: "Built by one person who wanted better research tools. Say hello!",
    gesture: "cheer",
  },
};

/** Portal: matched by longest pathname prefix. */
export const PORTAL_TIPS: { prefix: string; tip: MascotTip }[] = [
  { prefix: "/research/", tip: { text: "Scroll down for About, ratios, news and the Risk & events panel.", gesture: "point" } },
  { prefix: "/research", tip: { text: "Type a company name or ticker. I'll find it.", gesture: "inspect" } },
  { prefix: "/markets", tip: { text: "Tap any row to open its quote, depth and chart.", gesture: "point" } },
  { prefix: "/portfolio", tip: { text: "Add holdings or import a statement to unlock risk and tax views.", gesture: "point" } },
  { prefix: "/macro", tip: { text: "Compare rates, inflation and flows against market moves here.", gesture: "inspect" } },
  { prefix: "/intelligence", tip: { text: "Signals and flows, ranked. Click one to see what drove it.", gesture: "inspect" } },
  { prefix: "/Home", tip: { text: "Your 2-minute brief is at the top. Start there.", gesture: "wave" } },
];

export function portalTipFor(pathname: string): MascotTip | null {
  return PORTAL_TIPS.find((t) => pathname.startsWith(t.prefix))?.tip ?? null;
}
