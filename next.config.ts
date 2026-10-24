import type { NextConfig } from "next";
import { LEGACY_ROUTES } from "./src/lib/legacy-routes";
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
      ...LEGACY_ROUTES.map((r) => ({ source: r.from, ...(r.query ? { has: [{ type: "query" as const, key: r.query[0], value: r.query[1] }] } : {}), destination: r.to, permanent: true })),
    ];
  },
};

export default nextConfig;
