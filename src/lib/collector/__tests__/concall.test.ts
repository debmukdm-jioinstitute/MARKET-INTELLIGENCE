import { describe, expect, it } from "vitest";
import { abstractBullets, detectQuarter, extractHighlights, numbersSupported, parseTurns, sentencesOf, splitTranscript } from "@/lib/collector/concall-nlp";
import { countTone, toneScore } from "@/lib/collector/concall-tone";
import { findCandidates, summarizeTranscript, urlKey } from "@/lib/collector/concalls";

const FILLER = "Our teams continue to execute well across the portfolio and customers remain engaged with the platform. ";
const PREPARED =
  "Moderator: Ladies and gentlemen, good day and welcome to the Q1 FY2026-27 Earnings Conference Call for Acme Limited. " +
  "Moderator: Thank you. I now hand the conference over to the management. " +
  "Rohan Shah: Good morning everyone. We delivered strong demand momentum and new customer wins across our three segments this quarter. " +
  "We expect revenue growth of about 18% to 20% in FY27 driven by new capacity coming online. " +
  "Our order book stands at Rs 4,500 crore which gives good revenue visibility into the next year. " +
  "However, raw material inflation and currency volatility remain a headwind for margins this year. " +
  FILLER.repeat(40) +
  "Moderator: Thank you very much. The first question is from the line of Priya Nair from Alpha Securities. Please go ahead. " +
  "Priya Nair: Can you help us understand how much of the order book will convert into revenue over the next two years? " +
  "Rohan Shah: Roughly 60% should convert in FY27. " +
  "Priya Nair: And what kind of EBITDA margin should we assume given the raw material pressure? " +
  "Rohan Shah: We will stay near 14%. Moderator: Thank you. That was the last question.";
const TEXT = `Date: October 1, 2026 To, Listing Department BSE Limited. Sub: Transcript of call. ${PREPARED}`;

describe("transcript structure", () => {
  it("parses recurring speakers and ignores one-off labels", () => {
    const turns = parseTurns(PREPARED);
    expect(turns.map((t) => t.speaker)).toContain("Rohan Shah");
    expect(turns[0].speaker).toBe("Moderator");
  });
  it("splits prepared remarks from Q&A at the first-question handoff and finds analysts", () => {
    const sp = splitTranscript(TEXT);
    expect(sp.found).toBe(true);
    expect(sp.analysts.has("Priya Nair")).toBe(true);
    expect(sp.prepared.every((t) => t.speaker !== "Moderator")).toBe(true);
    expect(sp.qa.some((t) => t.speaker === "Priya Nair")).toBe(true);
  });
  it("reports found=false when there is no Q&A", () => {
    expect(splitTranscript("Moderator: Welcome. Rohan Shah: Hello. Rohan Shah: Bye.").found).toBe(false);
  });
});

describe("highlights are verbatim, quantitative where required", () => {
  const sp = splitTranscript(TEXT);
  const hl = extractHighlights(sp);
  it("keeps only quantitative guidance", () => {
    expect(hl.guidance.some((s) => /18% to 20%/.test(s))).toBe(true);
    expect(hl.guidance.every((s) => /\d/.test(s))).toBe(true);
  });
  it("finds risks and analyst questions, every bullet a real sentence from the text", () => {
    expect(hl.risks.some((s) => /inflation/.test(s))).toBe(true);
    expect(hl.qaThemes.length).toBeGreaterThan(0);
    for (const s of [...hl.guidance, ...hl.growthDrivers, ...hl.risks, ...hl.qaThemes]) expect(TEXT.replace(/\s+/g, " ")).toContain(s);
  });
  it("strips PDF page headers from sentences", () => {
    const s = sentencesOf("We expect margins to improve over the coming quarters as volumes scale up. Solar Industries India Limited September 15, 2026 Page 4 of 13 The balance sheet is very robust to support the acquisition.");
    expect(s.join(" ")).not.toMatch(/Page 4 of 13/);
  });
});

describe("numbers guard and meta", () => {
  it("rejects a candidate containing a number absent from the source", () => {
    expect(numbersSupported("Revenue grew 18% to Rs 4,500", "growth of 18% and Rs 4500 crore")).toBe(true);
    expect(numbersSupported("Revenue grew 25%", "growth of 18%")).toBe(false);
  });
  it("detects the fiscal quarter in common spellings", () => {
    expect(detectQuarter("Earnings Call – Q1 FY2026-27")).toBe("Q1 FY27");
    expect(detectQuarter("Q4 FY26 results")).toBe("Q4 FY26");
    expect(detectQuarter("nothing")).toBeNull();
  });
  it("abstractive pass returns null for tiny input instead of calling the model", async () => {
    expect(await abstractBullets(["Too short."])).toBeNull();
  });
});

describe("discovery + summarisation", () => {
  const rows = [
    { symbol: "RELIANCE", desc: "Analysts/Institutional Investor Meet/Con. Call Updates", attchmntText: "Reliance has informed the Exchange about Transcript of earnings call", attchmntFile: "https://nsearchives.nseindia.com/corporate/a.pdf", sort_date: "2026-10-02 10:00:00" },
    { symbol: "RELIANCE", desc: "General Updates", attchmntText: "Transcript of the 49th Annual General Meeting", attchmntFile: "https://nsearchives.nseindia.com/corporate/agm.pdf", sort_date: "2026-10-02 09:00:00" },
    { symbol: "TINYCO", desc: "Updates", attchmntText: "Transcript of earnings call", attchmntFile: "https://nsearchives.nseindia.com/corporate/t.pdf", sort_date: "2026-10-02 09:00:00" },
    { symbol: "TCS", desc: "Updates", attchmntText: "Transcript of analyst call", attchmntFile: "https://nsearchives.nseindia.com/corporate/seen.pdf", sort_date: "2026-10-01 09:00:00" },
  ];
  it("finds Nifty-500 earnings-call transcript PDFs only, skipping AGMs and already-seen URLs", () => {
    const c = findCandidates(rows, { [urlKey("https://nsearchives.nseindia.com/corporate/seen.pdf")]: "x" });
    expect(c.map((x) => x.symbol)).toEqual(["RELIANCE"]);
    expect(c[0].url).toMatch(/a\.pdf$/);
  });
  it("summarises a real-shaped transcript without HF and labels the method honestly", async () => {
    const out = await summarizeTranscript({ symbol: "ACME", headline: "Transcript Q1 FY27", url: "https://x/y.pdf", broadcastIso: "2026-10-01T10:00:00.000Z" }, TEXT, { hf: false });
    if (!("row" in out)) throw new Error(`unexpected skip: ${out.skip}`);
    expect(out.row.generatedBy).toMatch(/^extractive-rules/);
    expect(out.row.generatedBy).not.toMatch(/finbert|distilbart/i);
    expect(out.row.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(out.row.quarter).toBe("Q1 FY27");
  });
  it("skips cover-letter-only PDFs", async () => {
    const out = await summarizeTranscript({ symbol: "ACME", headline: "h", url: "u", broadcastIso: "2026-10-01T10:00:00.000Z" }, "Dear Sir, please find the transcript at our website.");
    expect(out).toEqual({ skip: "no-transcript-text" });
  });
});

describe("in-house tone scorer", () => {
  const up = "We delivered strong growth and record margins. Demand is robust and momentum is healthy. We are confident about the outlook and see good visibility. Order wins improved.";
  const down = "Demand remained weak and margins declined under pressure. We faced delays and uncertain conditions. Headwinds from inflation hurt volumes. We see risks and concerns ahead.";
  it("scores upbeat above 0 and downbeat below 0", () => {
    expect(toneScore(up)!).toBeGreaterThan(0.3);
    expect(toneScore(down)!).toBeLessThan(-0.3);
  });
  it("handles negation", () => {
    expect(countTone("no concerns")).toEqual({ pos: 1, neg: 0 });
    expect(countTone("not strong")).toEqual({ pos: 0, neg: 1 });
  });
  it("ignores safe-harbor boilerplate", () => {
    expect(countTone("This call contains forward-looking statements involving risks and uncertainties that may cause actual results to differ.")).toEqual({ pos: 0, neg: 0 });
  });
  it("returns null with too little signal", () => {
    expect(toneScore("Thank you everyone for joining the call today.")).toBeNull();
  });
  it("is always produced by the pipeline, no HF needed", async () => {
    const big = TEXT.replace("FILLER", "");
    const out = await summarizeTranscript({ symbol: "ACME", headline: "h", url: "u", broadcastIso: "2026-10-01T10:00:00.000Z" }, big);
    if (!("row" in out)) throw new Error("skip");
    expect(out.row.generatedBy).toMatch(/lexicon-tone|extractive-rules/);
  });
});
