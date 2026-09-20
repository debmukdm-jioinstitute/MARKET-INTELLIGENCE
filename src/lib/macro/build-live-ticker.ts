import { buildIndiaDashboardQuick } from "@/lib/feeds/india/build-dashboard";
import type { QuoteField } from "@/lib/feeds/india/types";
import { fetchYahooQuotes, yahooFinanceUrl } from "@/lib/feeds/sources/yahoo";
import { TICKER_INSTRUMENTS, type TickerInstrument } from "@/lib/macro/ticker-instruments";

export type LiveTickerItem = {
  id: string;
  label: string;
  symbol: string;
  price: number | null;
  changePct: number | null;
  prefix: string;
  suffix: string;
  decimals: number;
  copyKey: string;
  href?: string;
  group: TickerInstrument["group"];
  source: { provider: string; url: string; asOf?: string };
  live: boolean;
};

export type LiveTickerPayload = {
  fetchedAt: string;
  items: LiveTickerItem[];
};

const PULSE_SYMBOL: Record<string, "nifty" | "sensex" | "bankNifty" | "indiaVix" | "usdInr" | "brent" | "gold"> = {
  "^NSEI": "nifty",
  "^BSESN": "sensex",
  "^NSEBANK": "bankNifty",
  "^INDIAVIX": "indiaVix",
  "INR=X": "usdInr",
  "BZ=F": "brent",
  "GC=F": "gold",
};

function fromQuoteField(inst: TickerInstrument, q: QuoteField): LiveTickerItem {
  return {
    id: inst.id,
    label: inst.label,
    symbol: inst.symbol,
    price: q.value,
    changePct: q.changePct ?? null,
    prefix: inst.prefix ?? "",
    suffix: inst.suffix ?? "",
    decimals: inst.decimals ?? 2,
    copyKey: inst.copyKey,
    href: inst.href,
    group: inst.group,
    source: { ...q.source, asOf: q.source.asOf },
    live: q.value != null,
  };
}

function fromYahoo(inst: TickerInstrument, q: { price: number; changePct: number; asOf: string }) {
  return {
    id: inst.id,
    label: inst.label,
    symbol: inst.symbol,
    price: q.price,
    changePct: q.changePct,
    prefix: inst.prefix ?? "",
    suffix: inst.suffix ?? "",
    decimals: inst.decimals ?? 2,
    copyKey: inst.copyKey,
    href: inst.href,
    group: inst.group,
    source: { provider: "Yahoo Finance", url: yahooFinanceUrl(inst.symbol), asOf: q.asOf },
    live: true,
  };
}

function emptyItem(inst: TickerInstrument): LiveTickerItem {
  return {
    id: inst.id,
    label: inst.label,
    symbol: inst.symbol,
    price: null,
    changePct: null,
    prefix: inst.prefix ?? "",
    suffix: inst.suffix ?? "",
    decimals: inst.decimals ?? 2,
    copyKey: inst.copyKey,
    href: inst.href,
    group: inst.group,
    source: { provider: "Yahoo Finance", url: yahooFinanceUrl(inst.symbol) },
    live: false,
  };
}

export async function buildLiveTicker(): Promise<LiveTickerPayload> {
  const symbols = TICKER_INSTRUMENTS.map((t) => t.symbol);
  const [quotes, quick] = await Promise.all([
    fetchYahooQuotes(symbols),
    buildIndiaDashboardQuick().catch(() => null),
  ]);
  const qmap = new Map(quotes.map((q) => [q.symbol, q]));

  const items = TICKER_INSTRUMENTS.map((inst) => {
    const pulseKey = PULSE_SYMBOL[inst.symbol];
    if (quick && pulseKey) {
      const field = quick.pulse[pulseKey];
      if (field?.value != null) return fromQuoteField(inst, field);
    }
    const y = qmap.get(inst.symbol);
    if (y) return fromYahoo(inst, y);
    return emptyItem(inst);
  });

  return { fetchedAt: quick?.fetchedAt ?? new Date().toISOString(), items };
}
