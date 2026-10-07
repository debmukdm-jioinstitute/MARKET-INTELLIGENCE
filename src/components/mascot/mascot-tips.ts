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

/** Site-wide: matched by longest pathname prefix (order matters, most specific first). */
export const PORTAL_TIPS: { prefix: string; tip: MascotTip }[] = [
  { prefix: "/research/ai-desk", tip: { text: "Ask in plain English. Answers cite the same data you see in the terminal.", gesture: "point" } },
  { prefix: "/research/ipo", tip: { text: "Check GMP, subscription and listing history before you apply.", gesture: "inspect" } },
  { prefix: "/research/options-flow", tip: { text: "Unusual option activity shows where big money is positioning.", gesture: "inspect" } },
  { prefix: "/research/model", tip: { text: "Change an assumption and the model reprices instantly.", gesture: "point" } },
  { prefix: "/research/", tip: { text: "Scroll for About, ratios, news and the Risk & events panel.", gesture: "point" } },
  { prefix: "/research", tip: { text: "Type a company name or ticker. I'll find it.", gesture: "inspect" } },
  { prefix: "/markets/derivatives", tip: { text: "Option chain, OI and PCR in one view.", gesture: "inspect" } },
  { prefix: "/markets/sectors", tip: { text: "Sector heat map. Tap a sector to see its leaders.", gesture: "point" } },
  { prefix: "/markets", tip: { text: "Tap any row to open its quote, depth and chart.", gesture: "point" } },
  { prefix: "/portfolio", tip: { text: "Add holdings or import a statement to unlock risk and tax views.", gesture: "point" } },
  { prefix: "/macro/transmission", tip: { text: "See how crude, rupee and yields reach each sector.", gesture: "inspect" } },
  { prefix: "/macro", tip: { text: "Compare rates, inflation and flows against market moves here.", gesture: "inspect" } },
  { prefix: "/intelligence", tip: { text: "Signals and flows, ranked. Click one to see what drove it.", gesture: "inspect" } },
  { prefix: "/data", tip: { text: "Every feed shows its source and last refresh time.", gesture: "inspect" } },
  { prefix: "/alpha-league", tip: { text: "Compete with a practice portfolio. No real money at risk.", gesture: "cheer" } },
  { prefix: "/pricing", tip: { text: "Start free. Upgrade only when you need more.", gesture: "point" } },
  { prefix: "/learn", tip: { text: "Short explainers. Each ends with a tool you can try.", gesture: "inspect" } },
  { prefix: "/help", tip: { text: "Stuck? Search here, or ask the assistant bottom-right.", gesture: "wave" } },
  { prefix: "/methodology", tip: { text: "How every number is sourced and computed.", gesture: "inspect" } },
  { prefix: "/signup", tip: { text: "Free to start. No card needed.", gesture: "wave" } },
  { prefix: "/login", tip: { text: "Welcome back. Or try the demo desk without an account.", gesture: "wave" } },
  { prefix: "/Home", tip: { text: "Your 2-minute brief is at the top. Start there.", gesture: "wave" } },
  { prefix: "/profile", tip: { text: "Tune your watchlists and alerts here.", gesture: "point" } },
];

const FALLBACK_TIP: MascotTip = { text: "Need a hand? Search any stock and I'll show what moves it.", gesture: "wave", cta: { label: "Search stocks", href: "/research" } };

export function portalTipFor(pathname: string): MascotTip {
  return PORTAL_TIPS.find((t) => pathname.startsWith(t.prefix))?.tip ?? FALLBACK_TIP;
}
