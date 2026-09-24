import { SectionNav } from "@/components/layout/section-nav";

const ITEMS = [
  { href: "/macro", label: "Global Board" },
  { href: "/macro/india", label: "India Macro" },
  { href: "/macro/global", label: "Global Data" },
  { href: "/macro/stress", label: "Stress Index" },
  { href: "/macro/transmission", label: "Transmission Map" },
  { href: "/macro/scenarios", label: "Scenarios" },
  { href: "/macro/rbi", label: "RBI & Liquidity" },
  { href: "/macro/calendar", label: "Economic Calendar" },
];

export default function MacroLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SectionNav items={ITEMS} />
      {children}
    </div>
  );
}
