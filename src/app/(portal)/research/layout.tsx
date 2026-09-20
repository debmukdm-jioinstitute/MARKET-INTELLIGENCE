import { SectionNav } from "@/components/layout/section-nav";

const ITEMS = [
  { href: "/research", label: "Company Workbench" },
  { href: "/research/ai-desk", label: "AI Desk", badge: "AI" },
  { href: "/research/ipo", label: "IPO Pipeline" },
  { href: "/research/reports", label: "IC Reports" },
];

export default function ResearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SectionNav items={ITEMS} />
      {children}
    </div>
  );
}
