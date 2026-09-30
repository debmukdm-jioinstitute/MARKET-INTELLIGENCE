import { describe, expect, it } from "vitest";
import { stripGoogleTrendsJsonPrefix } from "@/lib/search-trends/google-trends";

describe("stripGoogleTrendsJsonPrefix", () => {
  it("strips legacy comma prefix", () => {
    expect(stripGoogleTrendsJsonPrefix(")]}',\n{\"ok\":true}")).toBe('{"ok":true}');
  });

  it("strips current newline-only prefix", () => {
    expect(stripGoogleTrendsJsonPrefix(")]}'\n{\"ok\":true}")).toBe('{"ok":true}');
  });
});
