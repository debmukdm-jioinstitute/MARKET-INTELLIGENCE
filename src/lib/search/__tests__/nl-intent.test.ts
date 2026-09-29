import { describe, expect, it } from "vitest";
import { isNaturalLanguageQuery } from "@/lib/search/nl-intent";

describe("isNaturalLanguageQuery", () => {
  it("detects the task's own example question", () => {
    expect(isNaturalLanguageQuery("how to connect market intelligence mcp to claude")).toBe(true);
  });

  it("detects any query ending in a question mark", () => {
    expect(isNaturalLanguageQuery("is nifty down today?")).toBe(true);
  });

  it("does not treat a short ticker/company fragment as a question", () => {
    expect(isNaturalLanguageQuery("relaince")).toBe(false);
    expect(isNaturalLanguageQuery("jp powr")).toBe(false);
    expect(isNaturalLanguageQuery("Reliance Industries")).toBe(false);
  });

  it("treats a 4+ word phrase as a question even without a starter word", () => {
    expect(isNaturalLanguageQuery("jaiprakash power ventures limited quarterly")).toBe(true);
  });
});
