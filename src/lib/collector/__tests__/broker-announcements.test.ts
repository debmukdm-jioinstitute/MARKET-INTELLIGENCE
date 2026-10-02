import { describe, expect, it } from "vitest";
import { buildSymbolResolver, canonicalBroker, parseBrokerFeed, parseHeadline, parseReportDate } from "@/lib/collector/broker-calls";
import { categorize, parseNseSortDate, selectMaterial } from "@/lib/collector/announcements";
import { announcementHash, cleanAnnouncement, cleanBrokerCall, cleanRecordBatch } from "@/lib/collector/records";

describe("broker headline parsing", () => {
  it("parses action, company, target and broker", () => {
    expect(parseHeadline("Buy Petronet LNG; target of Rs 362: Motilal Oswal")).toEqual({ action: "Buy", company: "Petronet LNG", target: 362, broker: "Motilal Oswal" });
  });
  it("handles thousands separators, decimals and entities", () => {
    expect(parseHeadline("Neutral M&amp;M; target of Rs 3,150.5: MOFSL")).toEqual({ action: "Neutral", company: "M&M", target: 3150.5, broker: "Motilal Oswal" });
  });
  it("rejects non-call headlines", () => {
    expect(parseHeadline("Trade Spotlight: How should you trade X on October 1?")).toBeNull();
  });
  it("canonicalises broker aliases and keeps unknown brokers as written", () => {
    expect(canonicalBroker("ICICI Sec")).toBe("ICICI Securities");
    expect(canonicalBroker("Obscure Capital")).toBe("Obscure Capital");
  });
  it("parses the report date and refuses to guess", () => {
    expect(parseReportDate("... in its research report dated September 28, 2026.")).toBe("2026-09-28");
    expect(parseReportDate("no date here")).toBeNull();
  });
});

describe("parseBrokerFeed", () => {
  const li = (id: number, title: string, summary: string) =>
    `<li class="clearfix" id="newslist-0"><a href="https://www.moneycontrol.com/news/business/stocks/x-${id}.html" title="${title}"><img></a><h2>${title}</h2><p>${summary}</p></li>`;
  it("keeps dated calls, skips spotlight articles and undated calls", () => {
    const html =
      li(14042829, "Buy Kotak Mahindra Bank; target of Rs 500: Prabhudas Lilladher", "bullish ... research report dated October 01, 2026.") +
      li(14042412, "Trade Spotlight: how to trade", "Bears may remain in control") +
      li(14041000, "Sell Foo Ltd; target of Rs 10: Bar Capital", "no date in summary");
    const { calls, articles } = parseBrokerFeed(html);
    expect(articles).toBe(3);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ articleId: 14042829, company: "Kotak Mahindra Bank", reportDate: "2026-10-01", targetPrice: 500 });
  });
});

describe("symbol resolver", () => {
  const r = buildSymbolResolver([
    { symbol: "KOTAKBANK", name: "KOTAK MAHINDRA BANK LTD" },
    { symbol: "LGEINDIA", name: "LG ELECTRONICS INDIA LTD" },
    { symbol: "TATAMOTORS", name: "TATA MOTORS LTD" },
    { symbol: "TATAMOTDVR", name: "TATA MOTORS LTD DVR" },
  ]);
  it("matches normalised names", () => {
    expect(r("Kotak Mahindra Bank")).toBe("KOTAKBANK");
    expect(r("LG Electronics India")).toBe("LGEINDIA");
  });
  it("tolerates abbreviated master names", () => {
    const r2 = buildSymbolResolver([
      { symbol: "FSL", name: "FIRSTSOURCE SOLU. LTD." },
      { symbol: "PRESTIGE", name: "PRESTIGE ESTATE LTD" },
      { symbol: "TTKPRESTIG", name: "TTK PRESTIGE LTD" },
      { symbol: "MAHLOG", name: "MAHINDRA LOGISTIC LIMITED" },
      { symbol: "M&MFIN", name: "M&M FIN. SERV. LTD" },
    ]);
    expect(r2("Firstsource Solutions")).toBe("FSL");
    expect(r2("Prestige Estates Projects")).toBe("PRESTIGE");
    expect(r2("Mahindra Finance")).toBe("M&MFIN");
    expect(r2("National Stock Exchange")).toBeNull();
    expect(r2("Mahindra Holidays")).toBeNull();
  });
  it("does not pick a side when two listings share a name", () => {
    const r3 = buildSymbolResolver([
      { symbol: "TMPV", name: "TATA MOTORS LTD" },
      { symbol: "TMCV", name: "TATA MOTORS LTD" },
    ]);
    expect(r3("Tata Motors")).toBeNull();
  });
  it("returns null rather than guessing", () => {
    expect(r("Totally Unknown Co")).toBeNull();
  });
});

describe("announcement categorisation", () => {
  it("keeps material categories and drops routine noise", () => {
    expect(categorize("Credit Rating", "x")).toBe("Credit rating");
    expect(categorize("Change in Director(s)", "x")).toBe("Management change");
    expect(categorize("Outcome of Board Meeting", "x")).toBe("Board meeting");
    expect(categorize("General Updates", "Outcome: Financial Results for Q2")).toBe("Financial results");
    expect(categorize("Trading Window", "closure of trading window")).toBeNull();
    expect(categorize("Copy of Newspaper Publication", "newspaper")).toBeNull();
    expect(categorize("Updates", "disclosure of pledge of shares")).toBe("Pledge disclosure");
  });
  it("converts IST sort_date to UTC", () => {
    expect(parseNseSortDate("2026-10-02 23:55:12")).toBe("2026-10-02T18:25:12.000Z");
    expect(parseNseSortDate("garbage")).toBeNull();
  });
  it("applies the watermark delta and dedups identical rows", () => {
    const row = { symbol: "TCS", desc: "Credit Rating", attchmntText: "Rating reaffirmed", sort_date: "2026-10-02 10:00:00", attchmntFile: "https://nsearchives.nseindia.com/a.pdf" };
    const old = { ...row, symbol: "INFY", sort_date: "2026-10-01 10:00:00" };
    const { rows, maxDate } = selectMaterial([row, row, old, { ...row, desc: "Trading Window", symbol: "WIPRO" }], "2026-10-02T00:00:00.000Z");
    expect(rows).toHaveLength(1);
    expect(rows[0].symbol).toBe("TCS");
    expect(maxDate).toBe(rows[0].broadcastDate);
  });
});

describe("record validation", () => {
  it("recomputes the announcement hash instead of trusting the client", () => {
    const a = cleanAnnouncement({ symbol: "tcs", headline: "h", category: "Credit rating", broadcastDate: "2026-10-02T04:30:00.000Z", attachmentUrl: null, contentHash: "forged" });
    expect(a?.contentHash).toBe(announcementHash("TCS", "h", "2026-10-02T04:30:00.000Z"));
  });
  it("drops malformed broker calls and nulls out-of-range tone scores", () => {
    expect(cleanBrokerCall({ company: "X", broker: "B", action: "Buy", reportDate: "bad", sourceUrl: "u" })).toBeNull();
    const ok = cleanBrokerCall({ company: "X", broker: "B", action: "Buy", targetPrice: 10, reportDate: "2026-10-01", sourceUrl: "u", tone: "positive", toneScore: 7 });
    expect(ok).toMatchObject({ targetPrice: 10, tone: "positive", toneScore: null });
  });
  it("rejects unknown tables", () => {
    expect(cleanRecordBatch({ table: "users", rows: [] })).toBeNull();
  });
});
