import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/research/transcript-archive", () => ({ getTranscriptArchive: vi.fn() }));
import { getTranscriptArchive } from "@/lib/research/transcript-archive";
import { GET } from "./route";
beforeEach(() => { vi.mocked(getTranscriptArchive).mockReset(); });
it("rejects unsafe symbols and markets before discovery", async () => {
  for (const q of ["symbol=../../x", "symbol=AAPL&market=XX", "symbol="]) expect((await GET(new Request(`https://example.com/api?${q}`))).status).toBe(400);
  expect(getTranscriptArchive).not.toHaveBeenCalled();
});
it("does not cache empty archives at the CDN", async () => {
  vi.mocked(getTranscriptArchive).mockResolvedValue({ status: "source_error", summary: null } as Awaited<ReturnType<typeof getTranscriptArchive>>);
  const response = await GET(new Request("https://example.com/api?symbol=ADANIPORTS"));
  expect(response.headers.get("cache-control")).toBe("no-store");
});
it("preserves the summary contract and routes US symbols explicitly", async () => {
  const data = { status: "ready", summary: { quarter: "Q3 2026" }, history: [] };
  vi.mocked(getTranscriptArchive).mockResolvedValue(data as unknown as Awaited<ReturnType<typeof getTranscriptArchive>>);
  const response = await GET(new Request("https://example.com/api?symbol=aapl&market=US"));
  expect(getTranscriptArchive).toHaveBeenCalledWith("AAPL", "US");
  expect(await response.json()).toEqual(data);
  expect(response.headers.get("cache-control")).toContain("s-maxage=900");
});
it("returns a sanitized retryable error without exposing credentials", async () => {
  vi.mocked(getTranscriptArchive).mockRejectedValue(new Error("upstream failed"));
  const response = await GET(new Request("https://example.com/api?symbol=ACME"));
  const body = await response.text(); expect(response.status).toBe(503); expect(body).not.toContain("upstream failed");
});
