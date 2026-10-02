import type { IndiaDashboardQuickPayload } from "@/lib/feeds/india/build-dashboard";
import type { IndiaDashboardPayload, MacroRow, QuoteField } from "@/lib/feeds/india/types";
import { formatInr, formatPct, sourceLabel } from "@/lib/marketing/landing-v2/format";
import type { MarketTab } from "@/lib/marketing/landing-v2/market-board-rows";

type BoardDashboard = IndiaDashboardPayload | IndiaDashboardQuickPayload;

export type PanelCard = { t: string; b: string };

export type MarketPanel = {
  heading: string;
  thesis: string;
  cards: PanelCard[];
};

function chgPhrase(field: QuoteField | undefined, label: string): string {
  if (field?.changePct == null || !Number.isFinite(field.changePct)) return "";
  const pct = formatPct(field.changePct);
  if (!pct) return "";
  const dir = field.changePct >= 0 ? "up" : "down";
  return `${label} ${dir} (${pct})`;
}

function valPhrase(field: QuoteField | undefined, suffix = ""): string {
  if (field?.value == null) return "";
  return `${formatInr(field.value, 2)}${suffix}`;
}

function macroLine(rows: MacroRow[] | undefined, needle: RegExp): string {
  const row = rows?.find((m) => needle.test(m.indicator));
  if (!row || row.current == null) return "";
  const unit = row.unit === "%" ? "%" : row.unit ? ` ${row.unit}` : "";
  return `${row.indicator}: ${row.current}${unit}`;
}

export function buildMarketPanel(tab: MarketTab, dashboard: BoardDashboard | null | undefined): MarketPanel {
  const pulse = dashboard?.pulse;
  const global = dashboard?.globalRadar;
  const macro = dashboard?.indiaMacro;
  const fii = dashboard?.moneyFlow?.fii?.today;
  const dii = dashboard?.moneyFlow?.dii?.today;
  const flows =
    fii != null || dii != null
      ? `FII ${fii != null ? `${fii >= 0 ? "+" : ""}${Math.round(fii)} Cr` : "—"} · DII ${dii != null ? `${dii >= 0 ? "+" : ""}${Math.round(dii)} Cr` : "—"}`
      : "";
  const b = pulse?.breadth;

  const headings: Record<MarketTab, { heading: string; thesis: string }> = {
    all: { heading: "CROSS-ASSET PULSE", thesis: "One board. Six lenses. Fewer blind spots." },
    currencies: { heading: "FX MONITOR", thesis: "See what is moving the rupee." },
    bonds: { heading: "RATES MONITOR", thesis: "Read the rate signal across the curve." },
    global: { heading: "WORLD MARKETS", thesis: "Know what happened before India opened." },
    macro: { heading: "ECONOMY MONITOR", thesis: "Turn releases into a readable economic story." },
    micro: { heading: "MICRO SIGNALS", thesis: "Move from the economy to the businesses inside it." },
  };

  const base = headings[tab];

  if (tab === "all") {
    const nifty = chgPhrase(pulse?.nifty, "Nifty");
    const gsec = chgPhrase(pulse?.gsec10y, "10Y yield");
    const changed = [nifty, gsec].filter(Boolean).join("; ") || "";
    const linked = [valPhrase(pulse?.usdInr), valPhrase(pulse?.brent), valPhrase(pulse?.gsec10y, "%")]
      .filter(Boolean)
      .join(" · ");
    return {
      ...base,
      cards: [
        { t: "WHAT CHANGED", b: changed },
        {
          t: "WHY IT MATTERS",
          b:
            pulse?.nifty?.changePct != null && pulse?.gsec10y?.changePct != null
              ? "Equities and rates moved together — check whether the story is growth, liquidity, or global spillover."
              : "",
        },
        { t: "LINKED ASSETS", b: linked },
        { t: "WATCH NEXT", b: flows || macroLine(macro, /repo|policy/i) },
      ],
    };
  }

  if (tab === "currencies") {
    return {
      ...base,
      cards: [
        { t: "DRIVER", b: [chgPhrase(pulse?.usdInr, "USD/INR"), chgPhrase(global?.dxy, "DXY"), chgPhrase(pulse?.brent, "Brent")].filter(Boolean).join("; ") },
        { t: "CONTEXT", b: valPhrase(pulse?.usdInr) ? `Spot ${valPhrase(pulse?.usdInr)}` : "" },
        { t: "LINKED ASSETS", b: [valPhrase(pulse?.brent), flows].filter(Boolean).join(" · ") },
        { t: "WATCH NEXT", b: sourceLabel(dashboard?.rbiLiquidity?.systemLiquidity?.source) ? "RBI liquidity series on macro hub" : "" },
      ],
    };
  }

  if (tab === "bonds") {
    return {
      ...base,
      cards: [
        { t: "CURVE", b: valPhrase(pulse?.gsec10y, "%") ? `India 10Y at ${valPhrase(pulse?.gsec10y, "%")}` : "" },
        {
          t: "TRANSLATION",
          b:
            pulse?.gsec10y?.changePct != null
              ? pulse.gsec10y.changePct < 0
                ? "Yields down — bond prices up."
                : "Yields up — borrowing cost rising."
              : "",
        },
        { t: "LINKED ASSETS", b: [valPhrase(pulse?.usdInr), "Nifty banks"].filter(Boolean).join(" · ") },
        { t: "WATCH NEXT", b: macroLine(macro, /repo|RBI/i) },
      ],
    };
  }

  if (tab === "global") {
    return {
      ...base,
      cards: [
        {
          t: "SESSION",
          b: [chgPhrase(global?.sp500, "S&P 500"), chgPhrase(global?.nasdaq, "Nasdaq"), chgPhrase(global?.dow, "Dow")]
            .filter(Boolean)
            .join("; "),
        },
        { t: "INDIA LINK", b: chgPhrase(pulse?.nifty, "Nifty") },
        { t: "RISK GAUGE", b: valPhrase(pulse?.indiaVix) ? `India VIX ${valPhrase(pulse?.indiaVix)}` : "" },
        { t: "WATCH NEXT", b: chgPhrase(global?.sp500, "US") || "" },
      ],
    };
  }

  if (tab === "macro") {
    const cpi = macroLine(macro, /CPI|inflation/i);
    const gdp = macroLine(macro, /GDP/i);
    const repo = macroLine(macro, /repo|policy/i);
    return {
      ...base,
      cards: [
        { t: "REGIME", b: [gdp, cpi].filter(Boolean).join(" · ") },
        { t: "SURPRISE", b: macro?.[0]?.indicator && macro[0].current != null ? `${macro[0].indicator} latest ${macro[0].current}${macro[0].unit === "%" ? "%" : ""}` : "" },
        { t: "MARKET LINK", b: [repo, valPhrase(pulse?.gsec10y, "%")].filter(Boolean).join(" · ") },
        { t: "WATCH NEXT", b: flows },
      ],
    };
  }

  const adv = b?.advances != null ? `${b.advances} advances` : "";
  const dec = b?.declines != null ? `${b.declines} declines` : "";
  return {
    ...base,
    cards: [
      { t: "BREADTH", b: [adv, dec].filter(Boolean).join(", ") },
      {
        t: "EARNINGS",
        b: b?.high52w != null || b?.low52w != null ? `52W highs ${b?.high52w ?? "—"} · lows ${b?.low52w ?? "—"}` : "",
      },
      {
        t: "VALUATION",
        b:
          pulse?.indexValuation?.pe?.value != null
            ? `Nifty 50 P/E ${formatInr(pulse.indexValuation.pe.value, 1)}`
            : "",
      },
      { t: "WATCH NEXT", b: chgPhrase(pulse?.nifty, "Index") },
    ],
  };
}

export function buildScenarioSteps(
  scenario: "risk-on" | "inflation" | "rupee",
  dashboard: BoardDashboard | null | undefined,
): string[] {
  const pulse = dashboard?.pulse;
  const lead =
    scenario === "risk-on"
      ? [chgPhrase(pulse?.nifty, "Equities"), chgPhrase(pulse?.gsec10y, "10Y")].filter(Boolean).join(" · ")
      : scenario === "inflation"
        ? [chgPhrase(pulse?.brent, "Crude"), chgPhrase(pulse?.gsec10y, "Yields")].filter(Boolean).join(" · ")
        : [chgPhrase(pulse?.usdInr, "USD/INR"), chgPhrase(pulse?.brent, "Oil")].filter(Boolean).join(" · ");

  const templates: Record<typeof scenario, string[]> = {
    "risk-on": [
      "How a risk-on move can travel",
      "Global yields ease → Borrowing pressure softens",
      "Foreign flows improve → Demand for local assets rises",
      "Equity breadth widens → More sectors join the move",
    ],
    inflation: [
      "Commodity prices rise → Input costs move first",
      "Bond yields reprice → Borrowing gets more expensive",
      "Rate-sensitive sectors weaken → Margins and valuations feel pressure",
    ],
    rupee: [
      "Dollar demand rises → The currency absorbs pressure",
      "Imported costs increase → Oil and inputs cost more",
      "Sector effects split → Exporters and importers react differently",
    ],
  };

  const steps = [...templates[scenario]];
  if (lead) steps[0] = `${steps[0]} (${lead})`;
  return steps;
}

export function panelCardsOrPlaceholders(cards: PanelCard[]): PanelCard[] {
  return cards.map((c) => ({ t: c.t, b: c.b.trim() ? c.b : "—" }));
}

export function trustReceiptRows(dashboard: BoardDashboard | null | undefined, fetchedAt: string) {
  const pulse = dashboard?.pulse;
  const rows = [
    { figure: "Nifty 50", field: pulse?.nifty },
    { figure: "USD/INR", field: pulse?.usdInr },
    { figure: "India 10Y yield", field: pulse?.gsec10y },
    { figure: "Brent crude", field: pulse?.brent },
    { figure: "India VIX", field: pulse?.indiaVix },
  ];
  return rows.map(({ figure, field }) => ({
    figure,
    source: sourceLabel(field?.source),
    fetched: field?.source?.asOf ?? fetchedAt,
    ok: field?.value != null && Boolean(sourceLabel(field?.source)),
  }));
}
