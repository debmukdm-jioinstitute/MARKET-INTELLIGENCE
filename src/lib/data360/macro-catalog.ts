/** WDI indicator codes shown on /macro — only these sync for IND + USA (see sync.ts). */
export const DATA360_MACRO_WB_CODES = [
  "NY.GDP.MKTP.CD",
  "NY.GDP.MKTP.KD.ZG",
  "NY.GDP.PCAP.KD.ZG",
  "NY.GDP.DEFL.KD.ZG",
  "NE.CON.PRVT.ZS",
  "NE.CON.GOVT.ZS",
  "NE.GDI.FTOT.ZS",
  "NE.EXP.GNFS.ZS",
  "NE.IMP.GNFS.ZS",
  "NV.AGR.TOTL.ZS",
  "NV.IND.MANF.ZS",
  "NV.IND.TOTL.ZS",
  "GC.DOD.TOTL.GD.ZS",
  "GC.TAX.TOTL.GD.ZS",
  "SL.UEM.TOTL.ZS",
  "SL.TLF.TOTL.IN",
  "BX.KLT.DINV.CD.WD",
  "BN.GSR.GNFS.CD",
] as const;

export const DATA360_MACRO_DATABASE = "WB_WDI";

export function v2CodeToData360Indicator(code: string): string {
  return `WB_WDI_${code.replace(/\./g, "_").toUpperCase()}`;
}

export function countryToRefArea(country: string): string {
  const c = country.trim().toUpperCase();
  if (c === "IN" || c === "IND") return "IND";
  if (c === "US" || c === "USA") return "USA";
  return c.length === 3 ? c : c;
}

export function data360ExplorerHref(databaseId: string, indicatorId: string, refArea: string): string {
  const sp = new URLSearchParams({ database: databaseId, indicator: indicatorId, ref_area: refArea });
  return `/data/data360?${sp}`;
}
