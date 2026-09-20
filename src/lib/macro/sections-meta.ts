import type { MacroSectionId } from "@/lib/macro/types";

export const MACRO_SECTIONS: {
  id: MacroSectionId;
  title: string;
  subtitle: string;
  href: string;
  accent: string;
}[] = [
  {
    id: "regime",
    title: "Macro regime",
    subtitle: "Growth, inflation, liquidity, rates, fiscal, external",
    href: "/macro/regime",
    accent: "#d4af37",
  },
  {
    id: "growth",
    title: "Growth",
    subtitle: "GDP, GVA, IIP, PMI proxies, high-frequency pulse",
    href: "/macro/growth",
    accent: "#3dd68c",
  },
  {
    id: "inflation",
    title: "Inflation",
    subtitle: "CPI stack, momentum, WPI decomposition",
    href: "/macro/inflation",
    accent: "#f97316",
  },
  {
    id: "rates-liquidity",
    title: "Rates & liquidity",
    subtitle: "RBI policy, system liquidity, money & banking",
    href: "/macro/rates-liquidity",
    accent: "#5ec8e8",
  },
  {
    id: "fiscal",
    title: "Government & fiscal",
    subtitle: "Deficit, borrowing, tax & GST proxies",
    href: "/macro/fiscal",
    accent: "#c084fc",
  },
  {
    id: "consumer",
    title: "Consumer",
    subtitle: "Auto, FMCG proxies, UPI, credit, housing",
    href: "/macro/consumer",
    accent: "#fbbf24",
  },
  {
    id: "corporate",
    title: "Corporate",
    subtitle: "Earnings proxies, credit, capacity utilisation",
    href: "/macro/corporate",
    accent: "#60a5fa",
  },
  {
    id: "external",
    title: "External",
    subtitle: "USD/INR, trade, reserves, FDI",
    href: "/macro/external",
    accent: "#fb7185",
  },
  {
    id: "employment",
    title: "Employment",
    subtitle: "Unemployment, LFPR, EPFO & jobs proxies",
    href: "/macro/employment",
    accent: "#94a3b8",
  },
  {
    id: "global",
    title: "Global macro",
    subtitle: "US, China, Europe, crude, DXY, VIX, US 10Y",
    href: "/macro/global",
    accent: "#a78bfa",
  },
];

export function sectionMeta(id: MacroSectionId) {
  return MACRO_SECTIONS.find((s) => s.id === id) ?? MACRO_SECTIONS[0]!;
}
