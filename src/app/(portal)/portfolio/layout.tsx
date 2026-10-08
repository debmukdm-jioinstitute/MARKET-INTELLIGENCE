"use client";

import { PortfolioSubnav } from "@/components/my-portfolio/portfolio-subnav";
import { usePathname } from "next/navigation";

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOverview = pathname === "/portfolio";

  return (
    <div className="space-y-4">
      {!isOverview && <PortfolioSubnav />}
      {children}
    </div>
  );
}
