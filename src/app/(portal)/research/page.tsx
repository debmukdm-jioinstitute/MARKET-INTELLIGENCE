import { ResearchHomeClient } from "@/app/(portal)/research/research-home-client";
import { pageMetadata } from "@/lib/seo/metadata";
import { RESEARCH_HUB_SYMBOLS } from "@/lib/seo/popular-symbols";
import Link from "next/link";

export const metadata = pageMetadata({
  title: "Research any Indian or US stock",
  description:
    "Free NSE/BSE and US ticker research — quotes, charts, fundamentals, and news when feeds are connected. Search Reliance, HDFC Bank, TCS, and more.",
  path: "/research",
});

export default function ResearchPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-2 py-8 md:py-12">
      <div className="mb-8 text-center">
        <p className="text-sm uppercase tracking-[0.28em] text-[#1a73e8]">Investment research</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Research any Indian or US stock</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          NSE, BSE, NYSE and NASDAQ symbols — quote, price history, fundamentals and headlines when our market feeds are
          connected.
        </p>
      </div>

      <ResearchHomeClient />

      <section className="mt-10" aria-labelledby="popular-stocks">
        <h2 id="popular-stocks" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Popular companies
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {RESEARCH_HUB_SYMBOLS.map(({ symbol, name }) => (
            <li key={symbol}>
              <Link
                href={`/research/${encodeURIComponent(symbol)}`}
                className="block rounded-lg border border-border bg-card px-3 py-2 text-sm hover:border-primary/40"
              >
                <span className="font-semibold text-foreground">{symbol}</span>
                <span className="text-muted-foreground"> — {name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <ul className="mx-auto mt-8 max-w-lg list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
        <li>Quotes and history — India via Upstox when configured; US via public feeds</li>
        <li>Headlines with rule-based sentiment tags — not buy/sell calls</li>
        <li>Open the valuation model from a symbol page when you want a DCF</li>
      </ul>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/learn" className="font-medium text-primary hover:underline">
          Learn guides
        </Link>{" "}
        ·{" "}
        <Link href="/research/ipo" className="font-medium text-primary hover:underline">
          IPO tracker
        </Link>{" "}
        ·{" "}
        <Link href="/research/offers" className="font-medium text-primary hover:underline">
          NCD · rights · buyback · OFS
        </Link>
      </p>
    </div>
  );
}
