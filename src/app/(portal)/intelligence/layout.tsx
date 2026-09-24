import { SectionNav } from "@/components/layout/section-nav";

const ITEMS = [
  { href: "/intelligence", label: "Intelligence Feed" },
  { href: "/intelligence/brief", label: "Daily Brief" },
  { href: "/intelligence/alerts", label: "Alert Rules" },
];

export default function IntelligenceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SectionNav items={ITEMS} />
      {children}
    </div>
  );
}
