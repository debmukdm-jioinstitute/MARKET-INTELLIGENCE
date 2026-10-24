import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Indian Equities & Market Indices Cockpit | Market Intelligence",
  description: "Live NSE indices, sectoral performance, market breadth, and equity valuation benchmarks.",
  path: "/markets?section=india",
});

export default function MarketsIndiaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
