import { fetchFiiDii } from "@/lib/feeds/india/nse-market";
import { persistFiiDiiRows, rollupFiiDiiFromStore } from "@/lib/feeds/india/fii-dii-store";
import type { FieldSource } from "@/lib/feeds/india/types";
import type { InstitutionalIntelligencePayload, InstitutionalTracker } from "./types";
import {
  deriveInstitutionalSignals,
  deriveSmartMoneyScore,
  smartMoneyLabel,
  type SignalInputs,
} from "./signals";

const NSE_FII_API = "https://www.nseindia.com/api/fiidiiTradeReact";
const NSE_FII_REPORT = "https://www.nseindia.com/reports/fii-dii";

type FiiDiiRow = { category: string; date?: string; netValue: string };

function parseNetCr(netValue?: string): number | null {
  if (!netValue) return null;
  const n = Number(netValue.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

async function buildMoneyFlowLegs(fiiDii: FiiDiiRow[]): Promise<InstitutionalIntelligencePayload["moneyFlow"]> {
  const fiiRow = fiiDii.find((r) => r.category.toUpperCase().includes("FII"));
  const diiRow = fiiDii.find((r) => r.category.toUpperCase().includes("DII"));
  const fiiNet = parseNetCr(fiiRow?.netValue);
  const diiNet = parseNetCr(diiRow?.netValue);
  await persistFiiDiiRows(fiiDii).catch(() => {});
  const roll = await rollupFiiDiiFromStore().catch(() => ({
    fii: { d5: null, m1: null, ytd: null },
    dii: { d5: null, m1: null, ytd: null },
  }));
  const nseSource: FieldSource = { provider: "NSE India", url: NSE_FII_API, asOf: fiiRow?.date ?? diiRow?.date };
  return {
    fii: {
      label: "FII / FPI",
      today: fiiNet,
      d5: roll.fii.d5,
      m1: roll.fii.m1,
      ytd: roll.fii.ytd,
      source: nseSource,
    },
    dii: {
      label: "DII",
      today: diiNet,
      d5: roll.dii.d5,
      m1: roll.dii.m1,
      ytd: roll.dii.ytd,
      source: { ...nseSource, asOf: diiRow?.date ?? fiiRow?.date },
    },
  };
}

function buildTrackers(moneyFlow: InstitutionalIntelligencePayload["moneyFlow"]): InstitutionalTracker[] {
  const nse: FieldSource = { provider: "NSE India", url: NSE_FII_REPORT };
  const sebi: FieldSource = { provider: "SEBI", url: "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&ssid=15&smid=10" };
  const amfi: FieldSource = { provider: "AMFI", url: "https://www.amfiindia.com/research-information/other-data/scheme-portfolio-details" };

  return [
    {
      id: "fii_fpi",
      label: "FII / FPI flows",
      coverage: "live",
      summary: "Daily NSE cash-market net FPI/FII figure with rollups when collector DB has history.",
      flows: {
        todayCr: moneyFlow.fii.today,
        m1Cr: moneyFlow.fii.m1,
        ytdCr: moneyFlow.fii.ytd,
      },
      sources: [nse, { provider: "NSDL FPI trends", url: "https://www.fpi.nsdl.co.in/web/Reports/Latest.aspx" }],
      href: NSE_FII_REPORT,
    },
    {
      id: "dii",
      label: "DII flows",
      coverage: "live",
      summary: "Domestic institutions (MF, insurers, banks, PF) — NSE aggregates DII net cash daily.",
      flows: {
        todayCr: moneyFlow.dii.today,
        m1Cr: moneyFlow.dii.m1,
        ytdCr: moneyFlow.dii.ytd,
      },
      sources: [nse],
    },
    {
      id: "mutual_funds",
      label: "Mutual funds",
      coverage: "unavailable",
      summary: "MF accumulation radar unavailable — AMC portfolio disclosures not yet ingested.",
      sources: [amfi, sebi],
      href: "/intelligence/institutional",
    },
    {
      id: "insurance",
      label: "Insurance companies",
      coverage: "partial",
      summary: "LIC and insurers sit inside NSE DII; disaggregated insurer books need IRDAI + BSE quarterly shareholding.",
      sources: [nse, { provider: "IRDAI", url: "https://irdai.gov.in/" }],
    },
    {
      id: "sovereign",
      label: "Sovereign funds",
      coverage: "planned",
      summary: "GIC/SWF stake changes surface via SEBI FPI categorisation and bulk/block — feed planned.",
      sources: [sebi, { provider: "CDSL", url: "https://www.cdslindia.com/" }],
    },
    {
      id: "family_offices",
      label: "Family offices",
      coverage: "planned",
      summary: "No public daily tape — inferred from bulk deals and quarterly shareholding (planned).",
      sources: [nse, { provider: "BSE", url: "https://www.bseindia.com/markets/equity/EQReports/bulk_deals.aspx" }],
    },
    {
      id: "promoters",
      label: "Promoters",
      coverage: "planned",
      summary: "Promoter holding % from exchange shareholding pattern filings each quarter.",
      sources: [nse, { provider: "BSE shareholding", url: "https://www.bseindia.com/corporates/shp.aspx" }],
      href: "https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern",
    },
    {
      id: "insiders",
      label: "Insider transactions",
      coverage: "partial",
      summary: "NSE/BSE insider and SAST pages (manual); US tickers use SEC Form 4 on security risk.",
      sources: [nse, { provider: "BSE insider", url: "https://www.bseindia.com/corporates/Insider_Trading.aspx" }],
      href: "https://www.nseindia.com/companies-listing/corporate-filings-insider-trading",
    },
  ];
}

const SOURCE_CATALOG: InstitutionalIntelligencePayload["sourceCatalog"] = [
  { id: "nse", label: "NSE India", url: NSE_FII_REPORT, role: "FII/DII daily cash flows" },
  { id: "bse", label: "BSE India", url: "https://www.bseindia.com/", role: "Bulk/block and shareholding filings" },
  { id: "sebi", label: "SEBI", url: "https://www.sebi.gov.in/", role: "FPI regulations and disclosure framework" },
  { id: "nsdl", label: "NSDL", url: "https://www.fpi.nsdl.co.in/", role: "FPI registration and trend reports" },
  { id: "cdsl", label: "CDSL", url: "https://www.cdslindia.com/", role: "Beneficial ownership and demat stats" },
  { id: "amfi", label: "AMFI", url: "https://www.amfiindia.com/", role: "MF scheme portfolio disclosures" },
  { id: "filings", label: "Company filings", url: "https://www.nseindia.com/companies-listing/corporate-filings-announcements", role: "Promoter/insider/shareholding events" },
];

export async function buildInstitutionalIntelligence(): Promise<InstitutionalIntelligencePayload> {
  const fiiDii = (await fetchFiiDii().catch(() => [])) as FiiDiiRow[];
  const moneyFlow = await buildMoneyFlowLegs(fiiDii);

  // Mutual-fund portfolio leg: no verified AMC disclosure feed is ingested yet,
  // so all MF inputs are null. Never substitute fabricated figures.
  const signalInput: SignalInputs = {
    fiiToday: moneyFlow.fii.today,
    fiiM1: moneyFlow.fii.m1,
    fiiYtd: moneyFlow.fii.ytd,
    diiToday: moneyFlow.dii.today,
    diiM1: moneyFlow.dii.m1,
    mfNetCapitalCr: null,
    mfAccumulatingCount: null,
    mfTrimmingCount: null,
  };

  const score = deriveSmartMoneyScore(signalInput);
  const { label, summary } = smartMoneyLabel(score);

  return {
    fetchedAt: new Date().toISOString(),
    smartMoney: { score, label, summary },
    signals: deriveInstitutionalSignals(signalInput),
    trackers: buildTrackers(moneyFlow),
    moneyFlow,
    mutualFunds: {
      dataStatus: "UNAVAILABLE",
      message:
        "Mutual-fund accumulation radar is unavailable — AMC portfolio disclosures are not yet ingested from a verified source.",
    },
    sourceCatalog: SOURCE_CATALOG,
  };
}

/** Trim holdings for MCP / terminal output size. */
export function compactInstitutionalForMcp(payload: InstitutionalIntelligencePayload) {
  return {
    fetchedAt: payload.fetchedAt,
    smartMoney: payload.smartMoney,
    signals: payload.signals,
    moneyFlow: {
      fii: {
        today: payload.moneyFlow.fii.today,
        m1: payload.moneyFlow.fii.m1,
        ytd: payload.moneyFlow.fii.ytd,
      },
      dii: {
        today: payload.moneyFlow.dii.today,
        m1: payload.moneyFlow.dii.m1,
        ytd: payload.moneyFlow.dii.ytd,
      },
    },
    mutualFunds: payload.mutualFunds,
    trackers: payload.trackers.map((t) => ({
      id: t.id,
      label: t.label,
      coverage: t.coverage,
      summary: t.summary,
    })),
    sourceCatalog: payload.sourceCatalog,
  };
}
