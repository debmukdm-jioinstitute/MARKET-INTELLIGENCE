import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "India & Global Macro Dashboard",
  description: "Growth, inflation, rates and cross-asset macro tape for India and global markets with source labels.",
  path: "/macro",
});

export default function MacroLayout({ children }: { children: React.ReactNode }) {
  return children;
}
