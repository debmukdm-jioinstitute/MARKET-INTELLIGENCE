import { describe, expect, it } from "vitest";
import type { ResearchReportRow } from "@/components/research/research-reports-table";
import { classifyReportRecency, groupReportsByRecency } from "@/lib/research/report-recency";

function row(partial: Partial<ResearchReportRow> & Pick<ResearchReportRow, "id" | "title" | "url">): ResearchReportRow {
  return {
    source: "test",
    broker: null,
    summary: null,
    published_at: null,
    scraped_at: "2026-09-01T00:00:00.000Z",
    ...partial,
  };
}

describe("report recency", () => {
  const now = new Date("2026-09-30T12:00:00.000Z");

  it("classifies today vs archive from published_at", () => {
    const fresh = row({
      id: "1",
      title: "Fresh",
      url: "https://example.com/1",
      published_at: "2026-09-30T06:00:00.000Z",
    });
    const old = row({
      id: "2",
      title: "Old",
      url: "https://example.com/2",
      published_at: "2026-06-01T00:00:00.000Z",
    });
    expect(classifyReportRecency(fresh, now)).toBe("today");
    expect(classifyReportRecency(old, now)).toBe("archive");
  });

  it("groups rows into recency sections", () => {
    const rows = [
      row({
        id: "1",
        title: "Today",
        url: "https://example.com/1",
        published_at: "2026-09-30T08:00:00.000Z",
      }),
      row({
        id: "2",
        title: "Archive",
        url: "https://example.com/2",
        published_at: "2026-01-15T00:00:00.000Z",
      }),
    ];
    const groups = groupReportsByRecency(rows, now);
    expect(groups.get("today")?.map((r) => r.title)).toEqual(["Today"]);
    expect(groups.get("archive")?.map((r) => r.title)).toEqual(["Archive"]);
  });
});
