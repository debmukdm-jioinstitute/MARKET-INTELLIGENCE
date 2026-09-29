import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Daily Market Brief — Nifty, Sensex & FII/DII",
  description: "Daily India market brief — index moves, flows context and headlines when feeds are connected.",
  path: "/intelligence/brief",
});

export default function BriefLayout({ children }: { children: React.ReactNode }) {
  return children;
}
