import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Indian Stock Market Intelligence & Live Dashboard",
  description: "Live Indian market dashboard, indices, breadth, FII/DII flows, macro indicators, and sector analysis.",
  path: "/Home",
});

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
