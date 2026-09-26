/** Yahoo Finance futures used on /macro/commodities and macro tape. */
export type CommodityCategory = "energy" | "precious" | "industrial" | "agriculture";

export type CommodityDef = {
  id: string;
  label: string;
  sym: string;
  copyKey: string;
  category: CommodityCategory;
  /** Display decimals for spot price */
  decimals: number;
  unit: string;
};

export const COMMODITY_CATEGORY_LABEL: Record<CommodityCategory, string> = {
  energy: "Energy",
  precious: "Precious metals",
  industrial: "Industrial metals",
  agriculture: "Agriculture & softs",
};

export const COMMODITY_UNIVERSE: CommodityDef[] = [
  { id: "brent", label: "Brent crude", sym: "BZ=F", copyKey: "brent", category: "energy", decimals: 2, unit: "USD/bbl" },
  { id: "wti", label: "WTI crude", sym: "CL=F", copyKey: "wti", category: "energy", decimals: 2, unit: "USD/bbl" },
  { id: "natgas", label: "Natural gas", sym: "NG=F", copyKey: "natgas", category: "energy", decimals: 2, unit: "USD/MMBtu" },
  { id: "gasoline", label: "RBOB gasoline", sym: "RB=F", copyKey: "gasoline", category: "energy", decimals: 2, unit: "USD/gal" },
  { id: "heating_oil", label: "Heating oil", sym: "HO=F", copyKey: "heating_oil", category: "energy", decimals: 2, unit: "USD/gal" },
  { id: "gold", label: "Gold", sym: "GC=F", copyKey: "gold", category: "precious", decimals: 0, unit: "USD/oz" },
  { id: "silver", label: "Silver", sym: "SI=F", copyKey: "silver", category: "precious", decimals: 2, unit: "USD/oz" },
  { id: "platinum", label: "Platinum", sym: "PL=F", copyKey: "platinum", category: "precious", decimals: 0, unit: "USD/oz" },
  { id: "palladium", label: "Palladium", sym: "PA=F", copyKey: "palladium", category: "precious", decimals: 0, unit: "USD/oz" },
  { id: "copper", label: "Copper", sym: "HG=F", copyKey: "copper", category: "industrial", decimals: 2, unit: "USD/lb" },
  { id: "aluminum", label: "Aluminum", sym: "ALI=F", copyKey: "aluminum", category: "industrial", decimals: 2, unit: "USD/lb" },
  { id: "corn", label: "Corn", sym: "ZC=F", copyKey: "corn", category: "agriculture", decimals: 2, unit: "US¢/bu" },
  { id: "soybeans", label: "Soybeans", sym: "ZS=F", copyKey: "soybeans", category: "agriculture", decimals: 2, unit: "US¢/bu" },
  { id: "wheat", label: "Wheat", sym: "ZW=F", copyKey: "wheat", category: "agriculture", decimals: 2, unit: "US¢/bu" },
  { id: "sugar", label: "Sugar #11", sym: "SB=F", copyKey: "sugar", category: "agriculture", decimals: 2, unit: "US¢/lb" },
  { id: "coffee", label: "Coffee", sym: "KC=F", copyKey: "coffee", category: "agriculture", decimals: 2, unit: "US¢/lb" },
  { id: "cotton", label: "Cotton", sym: "CT=F", copyKey: "cotton", category: "agriculture", decimals: 2, unit: "US¢/lb" },
];

export const COMMODITY_YAHOO_SYMBOLS = COMMODITY_UNIVERSE.map((c) => c.sym);

export function formatCommodityPrice(def: CommodityDef, price: number | null): string {
  if (price == null || !Number.isFinite(price)) return "—";
  if (def.category === "agriculture") {
    return `${price.toFixed(def.decimals)}¢`;
  }
  if (def.decimals === 0) {
    return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
  return `$${price.toFixed(def.decimals)}`;
}
