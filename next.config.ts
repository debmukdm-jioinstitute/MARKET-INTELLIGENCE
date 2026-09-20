import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    return [
      { source: "/app", destination: "/dashboard", permanent: true },
      { source: "/allocation", destination: "/portfolio/allocation", permanent: true },
      { source: "/risk", destination: "/portfolio/risk", permanent: true },
      { source: "/attribution", destination: "/portfolio/attribution", permanent: true },
      { source: "/quant", destination: "/portfolio/quant", permanent: true },
      { source: "/optimizer", destination: "/portfolio/optimizer", permanent: true },
      { source: "/backtest", destination: "/portfolio/backtest", permanent: true },
      { source: "/scenarios", destination: "/portfolio/scenarios", permanent: true },
      { source: "/ai-desk", destination: "/research/ai-desk", permanent: true },
      { source: "/ipo", destination: "/research/ipo", permanent: true },
      { source: "/reports", destination: "/research/reports", permanent: true },
      { source: "/india-markets", destination: "/markets/india", permanent: true },
      { source: "/derivatives", destination: "/markets/derivatives", permanent: true },
      { source: "/sectors", destination: "/markets/sectors", permanent: true },
      { source: "/feeds", destination: "/data/feeds", permanent: true },
    ];
  },
};

export default nextConfig;
