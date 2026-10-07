import { describe, expect, it, vi } from "vitest";

// Deterministic fake embeddings; keep the real cosineSimilarity. Mirrors the real 10-text cap.
vi.mock("@/lib/hf/embeddings", async (orig) => {
  const real = await orig<typeof import("@/lib/hf/embeddings")>();
  return {
    ...real,
    embedTexts: async (texts: string[]) =>
      texts.slice(0, 10).map((t) => Array.from({ length: 8 }, (_, i) => ((t.charCodeAt(i % t.length) * (i + 1)) % 17) + 1)),
  };
});

import { NextRequest } from "next/server";
import { GET } from "../route";

const call = (q: string) => GET(new NextRequest(`http://localhost/api/hf/similar-stocks?${q}`));

describe("GET /api/hf/similar-stocks", () => {
  it("returns same-industry Nifty 500 peers for an Indian ticker (was 404)", async () => {
    const res = await call("symbol=ETERNAL&limit=5");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.symbol).toBe("ETERNAL");
    expect(json.similar).toHaveLength(5);
    for (const s of json.similar) {
      expect(s.symbol).not.toBe("ETERNAL");
      expect(s.sector).toBe("Consumer Services");
    }
  });

  it("scores every US universe candidate without crashing past the 10-text batch (was 502)", async () => {
    const res = await call("symbol=AAPL&limit=10");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.similar).toHaveLength(10);
    expect(json.similar.every((s: { similarity: number }) => Number.isFinite(s.similarity))).toBe(true);
  });

  it("still 404s for unknown symbols", async () => {
    expect((await call("symbol=NOTAREALTICKER")).status).toBe(404);
  });
});
