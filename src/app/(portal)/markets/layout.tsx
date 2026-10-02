import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Nifty 50, Sensex & Stock Market Today",
  description: "Indian market dashboard — indices, breadth, sectors and derivatives when feeds are connected.",
  path: "/markets/india",
});

export default function MarketsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
