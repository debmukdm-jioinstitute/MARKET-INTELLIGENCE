import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Upcoming IPOs in India — Dates, Price Band & GMP",
  description:
    "Upcoming and ongoing IPOs in India — open/close dates, price band, lot size, grey market premium and DRHP links.",
  path: "/research/ipo",
});

export default function IpoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
