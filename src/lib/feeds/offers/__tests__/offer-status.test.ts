import { describe, expect, it } from "vitest";
import type { OfferRow } from "@/lib/feeds/offers/types";
import { classifyOfferStatus, groupOffersByStatus } from "@/lib/feeds/offers/offer-status";

const source = { provider: "Chittorgarh", url: "https://example.com", asOf: "2026-09-30T00:00:00.000Z" };

function row(partial: Partial<OfferRow> & Pick<OfferRow, "id" | "name">): OfferRow {
  return {
    category: "ncd",
    statusHint: null,
    fields: {},
    detailUrl: null,
    source,
    ...partial,
  };
}

describe("offer status", () => {
  const now = new Date("2026-09-30T12:00:00.000Z");

  it("maps Chittorgarh highlight hints", () => {
    expect(classifyOfferStatus(row({ id: "1", name: "A", statusHint: "color-green" }), now)).toBe("open");
    expect(classifyOfferStatus(row({ id: "2", name: "B", statusHint: "color-aqua" }), now)).toBe("listing");
    expect(classifyOfferStatus(row({ id: "3", name: "C", statusHint: "color-lightyellow" }), now)).toBe("upcoming");
  });

  it("infers closed and open from Indian date fields when hint empty", () => {
    const closed = row({
      id: "c",
      name: "Closed NCD",
      fields: { "Opening Date": "08-Sep-2026", "Closing Date": "22-Sep-2026" },
    });
    const open = row({
      id: "o",
      name: "Open NCD",
      fields: { "Opening Date": "21-Sep-2026", "Closing Date": "05-Oct-2026" },
    });
    expect(classifyOfferStatus(closed, now)).toBe("closed");
    expect(classifyOfferStatus(open, now)).toBe("open");
  });

  it("groups rows into lifecycle sections", () => {
    const rows = [
      row({
        id: "1",
        name: "Open",
        statusHint: "color-green",
        fields: { "Closing Date": "05-Oct-2026" },
      }),
      row({
        id: "2",
        name: "Past",
        fields: { "Closing Date": "01-Sep-2026" },
      }),
    ];
    const groups = groupOffersByStatus(rows, now);
    expect(groups.get("open")?.map((r) => r.name)).toEqual(["Open"]);
    expect(groups.get("closed")?.map((r) => r.name)).toEqual(["Past"]);
  });
});
