import type { IndiaDashboardQuickPayload } from "@/lib/feeds/india/build-dashboard";
import type { IndiaDashboardPayload, MacroRow, QuoteField } from "@/lib/feeds/india/types";

type BoardDashboard = IndiaDashboardPayload | IndiaDashboardQuickPayload;
import { formatInr, formatIstTimestamp, formatPct, liveFromQuote, sourceLabel } from "@/lib/marketing/landing-v2/format";

export type MarketTab = "all" | "currencies" | "bonds" | "global" | "macro" | "micro";
export type Range = "1D" | "1M" | "1Y";

export type WatchRowData = {
  label: string;
  value: string;
  change: string;
  source: string;
  fetched: string;
};

function changeForRange(
  range: Range,
  field: QuoteField | undefined,
  historyPct?: number | null,
  ytdPct?: number | null,
): string {
  if (range === "1M" && historyPct != null) return formatPct(historyPct);
  if (range === "1Y" && ytdPct != null) return formatPct(ytdPct);
  return formatPct(field?.changePct);
}

function rowFromField(
  label: string,
  field: QuoteField | undefined,
  fetchedAt: string,
  range: Range,
  opts?: { suffix?: string; digits?: number; historyPct?: number | null; ytdPct?: number | null },
): WatchRowData {
  const live = liveFromQuote(field, fetchedAt, { suffix: opts?.suffix, digits: opts?.digits });
  const change = changeForRange(range, field, opts?.historyPct, opts?.ytdPct);
  return {
    label,
    value: live.display || (field?.value != null ? `${formatInr(field.value, opts?.digits ?? 2)}${opts?.suffix ?? ""}` : ""),
    change: change || live.changeDisplay,
    source: live.source || sourceLabel(field?.source),
    fetched: live.fetched || formatIstTimestamp(fetchedAt),
  };
}

function macroRow(m: MacroRow, fetchedAt: string, range: Range): WatchRowData {
  const delta =
    m.previous != null && m.current != null && m.previous !== 0
      ? formatPct((m.current - m.previous) / Math.abs(m.previous))
      : "";
  return {
    label: m.indicator,
    value: m.current != null ? `${m.current}${m.unit === "%" ? "%" : m.unit ? ` ${m.unit}` : ""}` : "",
    change: range === "1D" ? delta : delta,
    source: sourceLabel(m.source),
    fetched: formatIstTimestamp(m.source.asOf ?? fetchedAt),
  };
}

export function buildMarketBoardRows(
  tab: MarketTab,
  range: Range,
  dashboard: BoardDashboard | null | undefined,
): WatchRowData[] {
  const fetchedAt = dashboard?.fetchedAt ?? new Date().toISOString();
  const pulse = dashboard?.pulse;
  const global = dashboard?.globalRadar;
  const moving = dashboard && "indiaMoving" in dashboard ? dashboard.indiaMoving : undefined;

  if (tab === "all") {
    return [
      rowFromField("NIFTY 50", pulse?.nifty, fetchedAt, range, {
        historyPct: moving?.nifty?.change1m,
        ytdPct: moving?.nifty?.changeYtd,
      }),
      rowFromField("USD/INR", pulse?.usdInr, fetchedAt, range, {
        historyPct: moving?.nifty ? undefined : undefined,
        digits: 2,
      }),
      rowFromField("INDIA 10Y bond yield", pulse?.gsec10y, fetchedAt, range, {
        suffix: "%",
        digits: 2,
      }),
      rowFromField("BRENT", pulse?.brent, fetchedAt, range),
      rowFromField("S&P 500", global?.sp500, fetchedAt, range),
    ];
  }

  if (tab === "currencies") {
    return [
      rowFromField("USD/INR spot", pulse?.usdInr, fetchedAt, range),
      rowFromField("Dollar Index", global?.dxy, fetchedAt, range),
      rowFromField("USD/INR (global radar)", global?.usdInr, fetchedAt, range),
    ];
  }

  if (tab === "bonds") {
    return [rowFromField("10Y G-Sec", pulse?.gsec10y, fetchedAt, range, { suffix: "%", digits: 2 })];
  }

  if (tab === "global") {
    return [
      rowFromField("S&P 500", global?.sp500, fetchedAt, range),
      rowFromField("NASDAQ", global?.nasdaq, fetchedAt, range),
      rowFromField("DOW", global?.dow, fetchedAt, range),
    ];
  }

  if (tab === "macro") {
    const rows = (dashboard?.indiaMacro ?? []).slice(0, 5).map((m) => macroRow(m, fetchedAt, range));
    if (rows.length) return rows;
    return [
      { label: "RBI policy rate", value: "", change: "", source: "", fetched: formatIstTimestamp(fetchedAt) },
      { label: "CPI inflation", value: "", change: "", source: "", fetched: formatIstTimestamp(fetchedAt) },
      { label: "FII / DII flows", value: "", change: "", source: "", fetched: formatIstTimestamp(fetchedAt) },
    ];
  }

  const b = pulse?.breadth;
  return [
    {
      label: "Advances",
      value: b?.advances != null ? String(b.advances) : "",
      change: b?.declines != null ? `${b.declines} declines` : "",
      source: sourceLabel(b?.source),
      fetched: formatIstTimestamp(b?.source.asOf ?? fetchedAt),
    },
    {
      label: "52W highs / lows",
      value: b?.high52w != null ? String(b.high52w) : "",
      change: b?.low52w != null ? `${b.low52w} lows` : "",
      source: sourceLabel(b?.source),
      fetched: formatIstTimestamp(b?.source.asOf ?? fetchedAt),
    },
  ];
}
