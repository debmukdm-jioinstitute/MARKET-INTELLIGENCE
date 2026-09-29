import { SearchTrendsDashboard } from "@/components/search-trends/search-trends-dashboard";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Search-trend intelligence — Attention Index",
  description:
    "Google Trends search interest for Indian companies, IPOs, sectors, commodities, macro indicators, policy, CEOs, and products — composite Attention Index with momentum.",
  path: "/intelligence/search-trends",
});

export default function SearchTrendsPage() {
  return <SearchTrendsDashboard />;
}
