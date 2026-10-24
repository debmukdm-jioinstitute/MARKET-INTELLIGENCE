import type { NextConfig } from "next";
import { worldMonitorApiRewrites } from "./src/lib/worldmonitor/api-proxy-rewrites";
import { worldMonitorStaticRewrites } from "./src/lib/worldmonitor/static-proxy-rewrites";

const WORLDMONITOR_UPSTREAM =
  process.env.WORLDMONITOR_UPSTREAM_ORIGIN?.trim() || "https://www.worldmonitor.app";

const nextConfig: NextConfig = {
  staticPageGenerationTimeout: 120,
  async rewrites() {
    return [
      ...worldMonitorApiRewrites(),
      ...worldMonitorStaticRewrites(WORLDMONITOR_UPSTREAM),
      {
        source: "/worldmonitor",
        destination: `${WORLDMONITOR_UPSTREAM}/dashboard`,
      },
      {
        source: "/worldmonitor/:path*",
        destination: `${WORLDMONITOR_UPSTREAM}/:path*`,
      },
      {
        source: "/assets/:path*",
        destination: `${WORLDMONITOR_UPSTREAM}/assets/:path*`,
      },
      {
        source: "/favico/:path*",
        destination: `${WORLDMONITOR_UPSTREAM}/favico/:path*`,
      },
      {
        source: "/manifest.webmanifest",
        destination: `${WORLDMONITOR_UPSTREAM}/manifest.webmanifest`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/worldmonitor/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.getmarketintelligence.in" }],
        destination: "https://getmarketintelligence.in/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "getmarketintelligence.vercel.app" }],
        destination: "https://getmarketintelligence.in/:path*",
        permanent: true,
      },
      { source: "/app", destination: "/dashboard", permanent: true },
      { source: "/allocation", destination: "/portfolio/allocation", permanent: true },
      { source: "/risk", destination: "/portfolio/risk", permanent: true },
      { source: "/attribution", destination: "/portfolio/attribution", permanent: true },
      { source: "/quant", destination: "/portfolio/quant", permanent: true },
      { source: "/optimizer", destination: "/portfolio/optimizer", permanent: true },
      { source: "/backtest", destination: "/portfolio", permanent: true },
      // Bare /scenarios stays a portfolio alias (macro scenarios live at /macro/scenarios -> /economy#scenarios).
      { source: "/scenarios", destination: "/portfolio", permanent: true },
      { source: "/portfolio/backtest", destination: "/portfolio", permanent: true },
      { source: "/portfolio/scenarios", destination: "/portfolio", permanent: true },
      { source: "/ai-desk", destination: "/research/ai-desk", permanent: true },
      { source: "/algo/:path*", destination: "/intelligence/scanner", permanent: true },
      { source: "/algo", destination: "/intelligence/scanner", permanent: true },

      // ---- Sitemap consolidation: old pages -> hub sections. HTTP redirects cannot carry #hash, so hubs read ?section=<id> and scroll.
      // Short aliases
      { source: "/ipo", destination: "/companies?section=ipo", permanent: true },
      { source: "/reports", destination: "/companies?section=broker-consensus", permanent: true },
      { source: "/research/reports", destination: "/companies?section=broker-consensus", permanent: true },
      { source: "/india-markets", destination: "/markets?section=india", permanent: true },
      { source: "/derivatives", destination: "/trade?section=derivatives", permanent: true },
      { source: "/markets/valuation", destination: "/markets?section=valuation", permanent: true },
      { source: "/markets/momentum", destination: "/markets?section=breadth", permanent: true },
      { source: "/sectors", destination: "/markets?section=sectors", permanent: true },
      { source: "/feeds", destination: "/data?section=feeds", permanent: true },
      // Markets
      { source: "/markets/india", destination: "/markets?section=india", permanent: true },
      { source: "/macro/indices", destination: "/markets?section=world", permanent: true },
      { source: "/macro/currency", destination: "/markets?section=currency", permanent: true },
      { source: "/macro/commodities", destination: "/markets?section=commodities", permanent: true },
      { source: "/markets/breadth", destination: "/markets?section=breadth", permanent: true },
      { source: "/markets/sectors", has: [{ type: "query", key: "tab", value: "valuation" }], destination: "/markets?section=valuation", permanent: true },
      { source: "/markets/sectors", destination: "/markets?section=sectors", permanent: true },
      { source: "/valuation", destination: "/markets?section=valuation", permanent: true },
      { source: "/activity", destination: "/markets?section=activity", permanent: true },
      { source: "/fear-and-greed", destination: "/markets?section=fear-greed", permanent: true },
      // Economy
      { source: "/macro", destination: "/economy", permanent: true },
      { source: "/macro/calendar", destination: "/Home?section=calendar", permanent: true },
      { source: "/macro/india", has: [{ type: "query", key: "view", value: "calendar" }], destination: "/economy?section=calendar", permanent: true },
      { source: "/macro/india", destination: "/economy?section=india-macro", permanent: true },
      { source: "/macro/rbi", destination: "/economy?section=rbi", permanent: true },
      { source: "/macro/global", destination: "/economy?section=global-data", permanent: true },
      { source: "/macro/yields", destination: "/economy?section=yields", permanent: true },
      { source: "/macro/stress", destination: "/economy?section=macro-stress", permanent: true },
      { source: "/macro/scenarios", destination: "/economy?section=scenarios", permanent: true },
      { source: "/macro/transmission", destination: "/economy?section=transmission", permanent: true },
      { source: "/data/data360", destination: "/economy?section=global-data", permanent: true },
      // Funds & Flows
      { source: "/intelligence/institutional", destination: "/funds?section=institutional", permanent: true },
      { source: "/funds/categories", destination: "/funds?section=categories", permanent: true },
      { source: "/funds/distribution", destination: "/funds?section=nfo-distribution", permanent: true },
      { source: "/funds/owners", destination: "/funds?section=sip", permanent: true },
      { source: "/funds/passive", destination: "/funds?section=passive", permanent: true },
      { source: "/funds/states", destination: "/funds?section=geo-aum", permanent: true },
      { source: "/funds/size", destination: "/funds?section=scheme-size", permanent: true },
      { source: "/etf", destination: "/funds?section=etf", permanent: true },
      { source: "/leverage", destination: "/funds?section=mtf", permanent: true },
      { source: "/leverage/mtf", destination: "/funds?section=mtf", permanent: true },
      // Companies
      { source: "/intelligence/company", destination: "/companies?section=company", permanent: true },
      { source: "/intelligence/promoters", destination: "/companies?section=promoters", permanent: true },
      { source: "/intelligence/credit", destination: "/companies?section=credit", permanent: true },
      { source: "/intelligence/legal-risk", destination: "/companies?section=legal-risk", permanent: true },
      { source: "/intelligence/reddit", destination: "/companies?section=retail-sentiment", permanent: true },
      { source: "/intelligence/search-trends", destination: "/companies?section=search-trends", permanent: true },
      { source: "/research", destination: "/companies?section=broker-consensus", permanent: true },
      { source: "/research-reports", destination: "/companies?section=research-notes", permanent: true },
      { source: "/research/ipo", destination: "/companies?section=ipo", permanent: true },
      { source: "/research/offers", destination: "/companies?section=offers", permanent: true },
      // Trade
      { source: "/markets/derivatives", destination: "/trade?section=derivatives", permanent: true },
      // Data
      { source: "/indicators", destination: "/data?section=indicators", permanent: true },
    ];
  },
};

export default nextConfig;
