import { afterEach, describe, expect, it, vi } from "vitest";
import PDFDocument from "pdfkit";
vi.mock("node:dns/promises", () => ({ lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]) }));
vi.mock("@/lib/db", () => ({ hasDatabase: () => false, ensureSchema: vi.fn(), sql: vi.fn(), toDateString: (s: string) => s }));
import { callDate, getTranscriptArchive, htmlText, transcriptLinks, transcriptHtmlText, validateSource } from "../transcript-archive";

const prep = "Operator: Welcome to Acme Q1 FY2026-27 earnings conference call. July 29, 2026. " +
  "Rohan Shah: We expect revenue growth of 18% to 20% in FY27 as our new capacity comes online. " +
  "Our new customers and order book support growth across the expanding business this year. " +
  "Raw material inflation and currency volatility remain a headwind for margins this year. " +
  "Our teams continue to execute across the portfolio and customers remain engaged with the platform. ".repeat(45) +
  "Operator: Our first question comes from Priya Nair at Alpha Securities. " +
  "Priya Nair: Can you help us understand how much revenue the new capacity will generate this year? " +
  "Rohan Shah: We will stay near our previously shared guidance for the coming year. Operator: Thank you.";
async function pdf(text: string) {
  const doc = new PDFDocument();
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => { doc.on("data", (b) => chunks.push(b)); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });
  doc.text(text); doc.end(); return done;
}
afterEach(() => vi.unstubAllGlobals());

describe("archive source integrity", () => {
  it("discovers actual archive links including relative PDFs and excludes AGM/audio", () => {
    const html = '<h2>Transcript</h2><a href="/transcripts/q1-fy27.pdf">Q1 FY27 Earnings Call</a><a href="/transcripts/agm.pdf">Annual General Meeting</a><a href="/audio/concall.mp3">Concall audio</a>';
    expect(transcriptLinks(html, "https://example.com/ir")).toEqual([{ title: "Q1 FY27 Earnings Call", url: "https://example.com/transcripts/q1-fy27.pdf" }]);
  });
  it("keeps US speaker blocks and excludes the separate summary", () => {
    const html = '<div aria-label="Full transcript"><div><div class="font-bold">Rohan Shah</div><div>CFO, Acme</div><p>Actual guidance for our business.</p></div></div><div>AI Summary: fake extra numbers.</div>';
    expect(transcriptHtmlText(html)).toBe("Rohan Shah: Actual guidance for our business.");
  });
  it("removes scripts and decodes HTML entities", () => expect(htmlText('<script>fake guidance 99%</script><p>Growth &amp; earnings</p>')).toBe("Growth & earnings"));
  it("does not invent a transcript date from a quarter label", () => {
    expect(callDate("Q1 FY27 Earnings Call")).toBeNull();
    expect(callDate("Earnings Call July 29, 2026")).toBe("2026-07-29");
  });
  it("rejects private hosts, IP literals, credentials, non-HTTPS and nonstandard ports", async () => {
    for (const u of ["https://127.0.0.1/x.pdf", "https://[::1]/x", "https://169.254.169.254/x", "https://10.0.0.2/x", "https://[::ffff:127.0.0.1]/x", "http://example.com/x", "https://x:y@example.com/", "https://example.com:8443/x"]) await expect(validateSource(u)).rejects.toThrow();
  });
  it("rejects unknown markets and unsafe symbols before fetching", async () => {
    await expect(getTranscriptArchive("../../secret")).rejects.toThrow();
    await expect(getTranscriptArchive("AAPL", "XX" as "US")).rejects.toThrow();
  });
});

describe("archive retrieval end to end", () => {
  it("parses a real PDF, works without DB/HF, and coalesces repeated requests", async () => {
    const bytes = await pdf(prep);
    const fetcher = vi.fn(async (u: string | URL | Request) => {
      const url = String(u);
      if (url.includes("nseindia.com")) return new Response(url.includes("/api/") ? "[]" : "NSE home");
      if (url.includes(".pdf")) return new Response(Uint8Array.from(bytes), { headers: { "content-type": "application/pdf" } });
      return new Response('<a href="https://example.com/transcripts/q1-fy27.pdf">Q1 FY27 Earnings call transcript</a>', { headers: { "content-type": "text/html" } });
    });
    vi.stubGlobal("fetch", fetcher);
    const [a, b] = await Promise.all([getTranscriptArchive("TESTARCH"), getTranscriptArchive("TESTARCH")]);
    expect(a).toEqual(b);
    expect(a.status).toBe("ready");
    expect(a.summary?.guidance.join(" ")).toContain("18% to 20%");
    expect(a.summary?.transcriptDate).toBe("2026-07-29");
    expect(a.summary?.tonePrepared).toBeNull();
    expect(a.history).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(7);
    await getTranscriptArchive("TESTARCH");
    expect(fetcher).toHaveBeenCalledTimes(7);
  });
  it("follows a PDF annotation from a cover letter to the actual call", async () => {
    const target = await pdf(prep);
    const doc = new PDFDocument(); const chunks: Buffer[] = [];
    const done = new Promise<Buffer>((resolve) => { doc.on("data", (c) => chunks.push(c)); doc.on("end", () => resolve(Buffer.concat(chunks))); });
    doc.text("Please find the transcript at the following link.");
    doc.link(10, 10, 200, 20, "https://example.com/transcripts/actual.pdf"); doc.end();
    const cover = await done;
    vi.stubGlobal("fetch", vi.fn(async (u: string | URL | Request) => String(u).endsWith("actual.pdf") ? new Response(Uint8Array.from(target)) : String(u).endsWith("cover.pdf") ? new Response(Uint8Array.from(cover)) : new Response('<a href="https://example.com/transcripts/cover.pdf">Earnings call transcript</a>')));
    const a = await getTranscriptArchive("COVERARCH");
    expect(a.status).toBe("ready");
    expect(a.summary?.sourceUrl).toBe("https://example.com/transcripts/actual.pdf");
  });
  it("keeps reading archive links when exchange filings are only one-page intimations", async () => {
    const bytes = await pdf(prep);
    const short = await pdf("Intimation of earnings call transcript.");
    const filings = Array.from({ length: 6 }, (_, i) => ({ symbol: "SHORTARCH", desc: "Transcript", attchmntText: "Transcript of earnings call", attchmntFile: `https://nsearchives.nseindia.com/corporate/short${i}.pdf`, sort_date: `2026-0${i + 1}-10 10:00:00` }));
    vi.stubGlobal("fetch", vi.fn(async (u: string | URL | Request) => {
      const url = String(u);
      if (url.includes("/api/")) return new Response(JSON.stringify(filings));
      if (url.includes("nseindia.com") && !url.includes("short")) return new Response("NSE home");
      if (url.includes("short")) return new Response(Uint8Array.from(short));
      if (url.includes(".pdf")) return new Response(Uint8Array.from(bytes));
      return new Response('<a href="https://example.com/transcripts/q1-fy27.pdf">Q1 FY27 Earnings call transcript</a>');
    }));
    const a = await getTranscriptArchive("SHORTARCH");
    expect(a.status).toBe("ready");
    expect(a.summary?.sourceUrl).toBe("https://example.com/transcripts/q1-fy27.pdf");
  });
  it("reads BSE announcement PDFs through the direct attachment path", async () => {
    const bytes = await pdf(prep);
    const seen: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (u: string | URL | Request) => {
      const url = String(u); seen.push(url);
      if (url.includes("AnnPdfOpen")) throw new TypeError("fetch failed");
      if (url.includes("AttachHis")) return new Response(Uint8Array.from(bytes), { headers: { "content-type": "application/pdf" } });
      return new Response('<a href="https://www.bseindia.com/stockinfo/AnnPdfOpen.aspx?Pname=abc-123.pdf">Transcript</a>');
    }));
    const a = await getTranscriptArchive("BSEARCH");
    expect(a.status).toBe("ready");
    expect(seen.some((u) => u.includes("/xml-data/corpfiling/AttachHis/abc-123.pdf"))).toBe(true);
    expect(seen.some((u) => u.includes("AnnPdfOpen"))).toBe(false);
  });
  it("does not claim missing filings when sources fail", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("unavailable", { status: 403 })));
    const a = await getTranscriptArchive("BLOCKED", "US");
    expect(a.status).toBe("source_error");
    expect(a.message).toContain("does not mean");
    expect(a.summary).toBeNull();
  });
  it("rejects private redirect targets", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 302, headers: { location: "https://127.0.0.1/secret" } })));
    expect((await getTranscriptArchive("REDIRECT", "US")).status).toBe("source_error");
  });
  it("retains links for paywalled or abbreviated US transcripts without inventing analysis", async () => {
    vi.stubGlobal("fetch", vi.fn(async (u: string | URL | Request) => new Response(String(u).endsWith("q1-2026/") ? "<main>Earnings conference call. Subscribe to read transcript.</main>" : '<a href="/stocks/testus/transcripts/q1-2026/">Earnings call transcript</a>', { headers: { "content-type": "text/html" } })));
    const a = await getTranscriptArchive("TESTUS", "US");
    expect(a.market).toBe("US"); expect(a.summary).toBeNull(); expect(a.documents).toHaveLength(1);
  });
});
