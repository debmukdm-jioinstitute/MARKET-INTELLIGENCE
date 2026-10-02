import { describe, expect, it } from "vitest";
import { aggregateDaily, buildMatcher, filterSpam, istDay, labelsToScore, textHash, topTopics, type Attributed, type Scored } from "@/lib/collector/sentiment-core";

const UNIVERSE = [
  ["RELIANCE", "Reliance Industries Ltd."],
  ["TCS", "Tata Consultancy Services Ltd."],
  ["TATAMOTORS", "Tata Motors Ltd."],
  ["TATASTEEL", "Tata Steel Ltd."],
  ["HDFCBANK", "HDFC Bank Ltd."],
  ["ITC", "ITC Ltd."],
  ["INFY", "Infosys Ltd."],
  ["BANKBARODA", "Bank of Baroda"],
  ["GESHIP", "Great Eastern Shipping Company Ltd."],
  ["ACE", "Action Construction Equipment Ltd."],
  ["ANGELONE", "Angel One Ltd."],
] as const;
const match = buildMatcher(UNIVERSE);

describe("ticker attribution", () => {
  it("matches cashtags, caps tickers and company names", () => {
    expect(match("Bought $TCS today")).toEqual(["TCS"]);
    expect(match("HDFCBANK results were fine")).toContain("HDFCBANK");
    expect(match("reliance industries Q2 looks strong")).toContain("RELIANCE");
    expect(match("Infosys Ltd guided higher")).toContain("INFY");
    expect(match("Great Eastern Shipping reported")).toContain("GESHIP");
  });
  it("does not guess on ambiguous or generic words", () => {
    expect(match("tata group is huge")).toEqual([]); // 'tata' is shared by several companies
    expect(match("the bank of india did well")).toEqual([]);
    expect(match("I own some stock in the power sector")).toEqual([]);
    expect(match("It was a great quarter, we need action on the supreme court ruling")).toEqual([]);
    expect(match("ACE of spades, angel investors")).toEqual([]);
    expect(match("$ACE looks interesting")).toEqual(["ACE"]); // a cashtag is explicit intent
  });
  it("matches full multi-word names", () => {
    expect(match("Tata Motors rallied while Tata Steel fell")).toEqual(expect.arrayContaining(["TATAMOTORS", "TATASTEEL"]));
  });
});

const a = (text: string, o: Partial<Attributed> = {}): Attributed => ({ source: "reddit", register: "social", text, author: "u1", day: "2026-10-02", symbols: ["TCS"], ...o });

describe("spam filter", () => {
  it("drops duplicate texts, heavy posters and bare forwards", () => {
    const heavy = Array.from({ length: 12 }, (_, i) => a(`pump message number ${i} about TCS going to the moon`, { author: "spammer" }));
    const { kept, dropped } = filterSpam([a("TCS looks good here"), a("tcs looks good here!"), ...heavy, a("fwd", { source: "telegram", author: null, forwarded: true })]);
    expect(dropped.duplicate).toBe(1);
    expect(dropped.heavyPoster).toBe(2); // posts 11 and 12
    expect(dropped.bareForward).toBe(1);
    expect(kept).toHaveLength(1 + 10);
  });
  it("hashes ignore case and punctuation", () => {
    expect(textHash("Buy TCS!!")).toBe(textHash("buy tcs"));
  });
});

describe("topics and aggregation", () => {
  it("returns only themes mentioned at least twice, never quotes", () => {
    const t = topTopics(["Strong deal wins boosting margins", "deal wins keep coming", "random unrelated chatter"], "TCS");
    expect(t[0]).toBe("deal wins");
    expect(topTopics(["only one mention of buyback here"], "TCS")).toEqual([]);
  });
  it("aggregates per symbol/day/source and keeps unscored rows honest", () => {
    const items: Scored[] = [
      { ...a("deal wins great"), score: 0.8 },
      { ...a("deal wins again"), score: -0.2 },
      { ...a("no score available", { symbols: ["TCS", "INFY"] }), score: null },
    ];
    const rows = aggregateDaily(items);
    const tcs = rows.find((r) => r.symbol === "TCS")!;
    expect(tcs).toMatchObject({ mentions: 3, scored: 2, sentimentMean: 0.3, bullishShare: 0.5 });
    const infy = rows.find((r) => r.symbol === "INFY")!;
    expect(infy).toMatchObject({ mentions: 1, sentimentMean: null, bullishShare: null });
  });
});

describe("labels and dates", () => {
  it("maps bullish/bearish and positive/negative label sets", () => {
    expect(labelsToScore([{ label: "Bullish", score: 0.7 }, { label: "Bearish", score: 0.1 }, { label: "Neutral", score: 0.2 }])).toBe(0.6);
    expect(labelsToScore([{ label: "negative", score: 0.9 }, { label: "positive", score: 0.05 }])).toBe(-0.85);
    expect(labelsToScore([{ label: "mystery", score: 1 }])).toBeNull();
  });
  it("converts instants to IST days", () => {
    expect(istDay(Date.parse("2026-10-02T20:00:00Z"))).toBe("2026-10-03");
  });
});
