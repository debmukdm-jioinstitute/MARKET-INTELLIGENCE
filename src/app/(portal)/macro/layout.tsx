import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Macro Intelligence & Economic Indicators | Market Intelligence",
  description: "India & global macro dashboard, RBI policy, inflation CPI/WPI, IIP, yield curve, and currency rates.",
  path: "/economy",
});

export default function MacroLayout({ children }: { children: React.ReactNode }) {
  return children;
}
