import { SectionNav } from "@/components/layout/section-nav";

const ITEMS = [
  { href: "/portfolio", label: "Command Center" },
  { href: "/portfolio/allocation", label: "Allocation" },
  { href: "/portfolio/risk", label: "Risk & VaR" },
  { href: "/portfolio/attribution", label: "Attribution" },
  { href: "/portfolio/quant", label: "Quant & Factors" },
  { href: "/portfolio/optimizer", label: "Optimizer" },
  { href: "/portfolio/backtest", label: "Backtest Desk" },
  { href: "/portfolio/scenarios", label: "Stress Testing" },
];

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SectionNav items={ITEMS} />
      {children}
    </div>
  );
}
