import { describe, expect, it, vi } from "vitest";

const calls: unknown[][] = [];
vi.mock("@/lib/db", () => ({
  hasDatabase: () => true,
  ensureSchema: async () => {},
  sql: () => async (_s: TemplateStringsArray, ...v: unknown[]) => {
    calls.push(v);
    return [];
  },
}));

import { persistPromoterFeedItems } from "../persist";

const item = (id: string, title: string) =>
  ({ id, channel: "nse", title, category: "other", companyName: null, symbol: null, transactionDate: "2026-10-24", sourceUrl: "u", snippet: null, collector: "nse-api" }) as never;

describe("persistPromoterFeedItems", () => {
  it("sends each id once so ON CONFLICT never hits a row twice", async () => {
    await persistPromoterFeedItems([item("a", "old"), item("b", "x"), item("a", "new")]);
    const ids = calls[0][0] as string[];
    const titles = calls[0][2] as string[];
    expect(ids).toEqual(["a", "b"]);
    expect(titles).toEqual(["new", "x"]);
  });
});
