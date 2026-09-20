import { SectionNav } from "@/components/layout/section-nav";

const ITEMS = [
  { href: "/markets", label: "Index & Universe" },
  { href: "/markets/india", label: "India Equities (NSE)" },
  { href: "/markets/breadth", label: "Breadth" },
  { href: "/markets/momentum", label: "Momentum" },
  { href: "/markets/valuation", label: "Valuation Snapshot" },
  { href: "/markets/derivatives", label: "F&O & Derivatives" },
  { href: "/markets/sectors", label: "Sectors", badge: "NEW" },
];

export default function MarketsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SectionNav items={ITEMS} />
      {children}
    </div>
  );
}
