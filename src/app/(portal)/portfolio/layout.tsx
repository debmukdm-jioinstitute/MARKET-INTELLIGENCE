import { PortfolioSubnav } from "@/components/my-portfolio/portfolio-subnav";

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <PortfolioSubnav />
      {children}
    </div>
  );
}
