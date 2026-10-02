import { describe, expect, it } from "vitest";
import { buildAgencyGrid, buildRatingEvents, hasRecentAlert, type RatingRowView } from "@/lib/research/ratings";
import { classifyAction, issuerSlug, issuerToRows, normalizeRating, parseIssuerPage, splitOutlook, careRationaleRows } from "@/lib/collector/credit-ratings";

const row = (o: Partial<RatingRowView>): RatingRowView => ({ agency: "CRISIL", rating: "AA", notch: "AA", outlook: null, watch: null, action: "reaffirmation", actionDate: "2026-09-01", rationaleUrl: "https://r", source: "RETAILBONDS", ...o });

describe("rating normalization (7-notch)", () => {
  it("strips agency prefixes/qualifiers and keeps +/- modifiers", () => {
    expect(normalizeRating("CRISIL AA+", "CRISIL")).toEqual({ rating: "AA+", notch: "AA" });
    expect(normalizeRating("[ICRA]BBB- (CE)", "ICRA")).toEqual({ rating: "BBB-", notch: "BBB" });
    expect(normalizeRating("CARE D", "CARE")).toEqual({ rating: "D", notch: "D" });
    expect(normalizeRating("CCC", "CRISIL")).toEqual({ rating: "CCC", notch: "B" });
  });
  it("returns nulls for short-term / unparseable ratings", () => {
    expect(normalizeRating("A1+", "CRISIL")).toEqual({ rating: null, notch: null });
    expect(normalizeRating("—", "CARE")).toEqual({ rating: null, notch: null });
  });
  it("classifies action labels and splits outlook vs watch", () => {
    expect(classifyAction("Rating downgraded")).toBe("downgrade");
    expect(classifyAction("Initial")).toBe("initial");
    expect(classifyAction("???")).toBe("update");
    expect(splitOutlook("Watch Negative")).toEqual({ outlook: null, watch: "negative" });
    expect(splitOutlook("Stable")).toEqual({ outlook: "stable", watch: null });
    expect(splitOutlook("—")).toEqual({ outlook: null, watch: null });
  });
  it("builds issuer slugs", () => {
    expect(issuerSlug("Reliance Industries Ltd.")).toBe("reliance-industries-limited");
    expect(issuerSlug("Larsen & Toubro Ltd.")).toBe("larsen-and-toubro-limited");
  });
});

const PAGE = `<table class="bond-table"><thead><tr><th>Agency</th><th>Rating</th><th>Outlook</th><th>Bonds</th></tr></thead><tbody>
<tr><td>CRISIL</td><td class="mono">AAA</td><td>—</td><td class="mono">2</td></tr>
<tr><td>CRISIL</td><td class="mono">AA+</td><td>Stable</td><td class="mono">9</td></tr>
<tr><td>CARE</td><td class="mono">AAA</td><td>—</td><td class="mono">6</td></tr></tbody></table>
<div class="rating-timeline-item"><div class="rating-timeline-date">2026-09-25 · CRISIL</div><div class="rating-timeline-rating">AA+</div><div class="rating-timeline-outlook"><span style="color:var(--fg-muted);">Downgrade</span> · Negative</div></div>`;

describe("issuer page parsing", () => {
  it("reads the agency table and action timeline, picking the rating that covers most bonds", () => {
    const parsed = parseIssuerPage(PAGE);
    expect(parsed.agencies).toHaveLength(3);
    expect(parsed.actions).toEqual([{ date: "2026-09-25", agency: "CRISIL", rating: "AA+", label: "Downgrade", outlook: "Negative" }]);
    const { rows } = issuerToRows("X", parsed, "https://retailbonds.in/issuer/x", "2026-10-02");
    const crisil = rows.find((r) => r.agency === "CRISIL" && r.action === "current")!;
    expect(crisil).toMatchObject({ rating: "AA+", outlook: "stable" });
    expect(rows.find((r) => r.action === "downgrade")).toMatchObject({ actionDate: "2026-09-25", outlook: "negative" });
  });
  it("skips unchanged snapshots", () => {
    const parsed = parseIssuerPage(PAGE);
    const prev = { "ratings:X:CARE": "AAA||" };
    const { rows } = issuerToRows("X", parsed, "u", "2026-10-02", prev);
    expect(rows.some((r) => r.agency === "CARE" && r.action === "current")).toBe(false);
  });
  it("keeps only exact-name, last-12-month CARE rationales", () => {
    const recent = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const rows = careRationaleRows("RELIANCE", "Reliance Industries Ltd.", [
      { CompanyName: "Reliance Industries Limited", FileURL: "a b.pdf", PublishedDate: recent },
      { CompanyName: "Reliance Ethane Pipeline Limited", FileURL: "x.pdf", PublishedDate: recent },
      { CompanyName: "Reliance Industries Limited", FileURL: "old.pdf", PublishedDate: "2019-01-01 00:00:00.000" },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].rationaleUrl).toBe("https://www.careratings.com/upload/CompanyFiles/PR/a%20b.pdf");
  });
});

describe("agency grid + radar", () => {
  it("shows honest 'not covered' for missing agencies and rationale-only coverage", () => {
    const grid = buildAgencyGrid([row({ action: "current", actionDate: "2026-10-02" }), row({ agency: "CARE", rating: null, notch: null, action: "rationale", actionDate: "2026-08-01" })]);
    expect(grid.map((g) => [g.agency, g.covered])).toEqual([["CRISIL", true], ["CARE", true], ["ICRA", false]]);
    expect(grid[1]).toMatchObject({ rating: null, lastAction: "rationale", lastActionDate: "2026-08-01" });
  });
  it("fires events for downgrade / negative outlook / negative watch only on agency actions", () => {
    const rows = [
      row({ action: "downgrade", actionDate: "2026-09-20", rating: "A+" }),
      row({ action: "reaffirmation", outlook: "negative", actionDate: "2026-08-10" }),
      row({ action: "update", watch: "negative", actionDate: "2026-07-10" }),
      row({ action: "current", outlook: "negative", actionDate: "2026-10-02" }), // snapshot: no event
      row({ action: "upgrade", actionDate: "2026-06-01" }),
    ];
    const ev = buildRatingEvents(rows);
    expect(ev.map((e) => e.type)).toEqual(["downgrade", "negative-outlook", "watch-negative"]);
    expect(hasRecentAlert(ev, new Date("2026-10-02"))).toBe(true);
    expect(hasRecentAlert(ev, new Date("2027-03-01"))).toBe(false);
  });
  it("lists NSE rating disclosures as informational, never as an alert", () => {
    const ev = buildRatingEvents([], [{ date: "2026-10-01", headline: "X has informed the Exchange about Credit Rating", url: "https://p.pdf" }]);
    expect(ev[0].type).toBe("disclosure");
    expect(hasRecentAlert(ev, new Date("2026-10-02"))).toBe(false);
  });
});
