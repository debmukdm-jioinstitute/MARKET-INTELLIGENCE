import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "IPO intelligence — DRHP, GMP, subscription & analyst view",
  description:
    "Indian IPO calendar with DRHP/RHP links, issue structure extract, grey market premium, subscription, listing performance, and on-demand equity research-style analysis.",
  path: "/research/ipo",
});

export default function IpoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
