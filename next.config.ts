import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    return [
      { 
        source: "/:path*", 
        has: [{ type: "host", value: "getmarketintelligence.vercel.app" }], 
        destination: "https://getmarketintelligence.in/:path*", 
        permanent: true 
      },
      { source: "/app", destination: "/dashboard", permanent: true },
      { source: "/allocation", destination: "/portfolio/allocation", permanent: true },
      { source: "/risk", destination: "/portfolio/risk", permanent: true },
      { source: "/attribution", destination: "/portfolio/attribution", permanent: true },
      { source: "/quant", destination: "/portfolio/quant", permanent: true },
      { source: "/optimizer", destination: "/portfolio/optimizer", permanent: true },
      { source: "/backtest", destination: "/portfolio", permanent: true },
      { source: "/scenarios", destination: "/portfolio", permanent: true },
      { source: "/portfolio/backtest", destination: "/portfolio", permanent: true },
      { source: "/portfolio/scenarios", destination: "/portfolio", permanent: true },
      { source: "/ai-desk", destination: "/research/ai-desk", permanent: true },
      { source: "/ipo", destination: "/research/ipo", permanent: true },
      { source: "/reports", destination: "/research", permanent: true },
      { source: "/research/reports", destination: "/research", permanent: true },
      { source: "/india-markets", destination: "/markets/india", permanent: true },
      { source: "/derivatives", destination: "/markets/derivatives", permanent: true },
      { source: "/markets/valuation", destination: "/markets/sectors?tab=valuation", permanent: true },
      { source: "/markets/momentum", destination: "/markets/breadth#momentum", permanent: true },
      { source: "/sectors", destination: "/markets/sectors", permanent: true },
      { source: "/feeds", destination: "/data/feeds", permanent: true },
    ];
  },
};

export default nextConfig;
