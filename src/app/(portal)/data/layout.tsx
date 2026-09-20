import { SectionNav } from "@/components/layout/section-nav";

const ITEMS = [
  { href: "/data", label: "Sources & Status" },
  { href: "/data/feeds", label: "Raw Feed Hub" },
];

export default function DataLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SectionNav items={ITEMS} />
      {children}
    </div>
  );
}
