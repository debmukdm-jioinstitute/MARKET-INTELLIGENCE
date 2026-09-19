import type { FieldSource } from "@/lib/feeds/india/types";

export type KeyRatio = {
  name: string;
  companyValue: number | null;
  sectorValue: number | null;
  unitSuffix: "%" | "x" | "";
};

export type FundamentalsSnapshot = {
  isin: string;
  ratios: KeyRatio[];
  source: FieldSource;
};
