import { DATA_ISSUE_EMAIL, STALE_AFTER_MINUTES } from "@/lib/provenance";
import Link from "next/link";

export const revalidate = 3600;

export const metadata = {
  title: "Methodology & data sources — Market Intelligence",
  description:
    "Data coverage, freshness rules, formulas and adjustments, AI methodology, corrections and privacy for Market Intelligence.",
};

type Section = { id: string; title: string; body: string[] };

const SECTIONS: Section[] = [
  {
    id: "coverage",
    title: "Data coverage",
    body: [
      "Exchanges and assets: NSE and BSE equities and indices, NSE F&O (option chains and Greeks via Upstox), US equities, RBI rates, government bonds, commodities and currencies.",
      "Providers: NSE India and Upstox for Indian markets; RBI and public open-data portals for macro; Yahoo Finance and FRED for global series. Each figure names its provider and links to it where possible.",
      "History and fields: price history depth and available fields differ by instrument. A missing field is shown as unavailable, never estimated.",
    ],
  },
  {
    id: "freshness",
    title: "Freshness rules",
    body: [
      `Every quote shows an as-of time in IST and a badge. "Live" appears only when the provider states zero delay. "Delayed N min" appears when the provider states a delay. With no stated delay, the badge shows the age of the timestamp and switches to "Stale" once it is older than ${STALE_AFTER_MINUTES} minutes.`,
      "End-of-day series (scanner, backtests, most macro data) update after each NSE close or on the source's release schedule. Outside market hours, quotes show the last close.",
      "If a feed fails, the page says so instead of showing an estimate.",
    ],
  },
  {
    id: "states",
    title: "Market states",
    body: [
      "Live: the provider states zero delay; shown with an updating indicator and timestamp. Delayed: shows the delay duration. Closed: outside the NSE session (Mon–Fri 09:15–15:30 IST) shows the last close and the next session; exchange holidays are not modelled, so the next-session time can be a day early on a holiday.",
      "Stale: warns and shows the last successful value with its time. Unavailable: gives the reason and a retry or report action. Estimated: names the method and explains it in a tooltip.",
    ],
  },
  {
    id: "conventions",
    title: "Numbers, colour and charts",
    body: [
      "Direction is never shown by colour alone: figures carry a + or − sign and a ▲/▼ marker. One negative-number style (−1.23%) is used everywhere. Prices use Indian digit grouping (1,00,000) unless a view says otherwise.",
      "Charts name the metric and instrument, state the range and frequency, label axis units, and give exact time, value, change and source status in the tooltip. Each chart can be viewed as a table and downloaded as CSV. Range buttons appear only where the data source supports them.",
    ],
  },
  {
    id: "methodology",
    title: "Formulas, adjustments and estimates",
    body: [
      "Derived metrics (Sharpe, beta, VaR, drawdown, valuation ratios) open a definition with the formula, inputs, reporting period and data source. Metrics built on estimates or models are labelled as such.",
      "Prices are labelled as adjusted or unadjusted for corporate actions where that applies. Backtests use the stated universe and dates, exclude some real-world costs, and past results do not predict future returns.",
    ],
  },
  {
    id: "ai",
    title: "AI methodology",
    body: [
      "The AI Desk runs several language-model agents (fundamental, sentiment, technical, bull, bear, trader, risk) over price data, ratios and news headlines fetched at run time. Each output shows its evidence date and where agents disagree.",
      "Confidence figures are the model's own estimate, not a calibrated probability. Models can misread sources, miss recent events or be wrong. Output is research information, not a recommendation.",
    ],
  },
  {
    id: "corrections",
    title: "Corrections",
    body: [
      `Found a wrong number? Use "Report an issue" beside the figure; it opens an email with the exact datum, provider and timestamp filled in. You can also write to ${DATA_ISSUE_EMAIL}.`,
    ],
  },
  {
    id: "privacy",
    title: "Privacy and security",
    body: [
      "Account data and portfolio data are stored to run your account. Guest sessions are not saved to an account. See the Privacy Policy for what is collected and how to request deletion.",
    ],
  },
  {
    id: "demo",
    title: "Guest and demo portfolios",
    body: ["Guest mode uses simulated books. Trades and settings are not saved to an account and involve no real money or brokerage."],
  },
  {
    id: "disclaimer",
    title: "Not investment advice",
    body: [
      "Market Intelligence provides descriptive data and analytics for information and education only. It is not investment, tax or legal advice and not an offer to buy or sell any security. Data may be delayed or contain errors; verify with your broker or the exchange before acting.",
    ],
  },
];

export default function MethodologyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 text-foreground">
      <Link href="/" className="text-sm text-primary underline-offset-4 hover:underline">← Back</Link>
      <h1 className="mt-4 text-3xl font-semibold">Methodology &amp; data sources</h1>
      <p className="mt-2 text-sm text-muted-foreground">What the numbers are, where they come from, and their limits.</p>
      <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="text-primary underline-offset-4 hover:underline">{s.title}</a>
        ))}
      </nav>
      {SECTIONS.map((s) => (
        <section key={s.id} id={s.id} className="mt-8 scroll-mt-20">
          <h2 className="text-lg font-semibold">{s.title}</h2>
          {s.body.map((p) => (
            <p key={p} className="mt-2 text-sm leading-6 text-muted-foreground">{p}</p>
          ))}
        </section>
      ))}
    </main>
  );
}
