import { describe, expect, it } from "vitest";
import { parseChittorgarhIpoReviewTable } from "@/lib/research/sources/chittorgarh-ipo-reviews";
import { consensusToReco, normalizeReco } from "@/lib/research/normalize";

describe("parseChittorgarhIpoReviewTable", () => {
  it("parses minimal table snippet", () => {
    const html = `
      IPO Reviews
      <table class="table table-striped">
        <tr>
          <td class="text"><a href="/ipo/acme-ipo/123/" title="Acme Ltd IPO">Acme Ltd IPO</a></td>
          <td class="text-center">10</td>
          <td class="text-center">2</td>
          <td class="text-center">1</td>
          <td class="text-center">0</td>
          <td class="text-center">3</td>
        </tr>
      </table>`;
    const rows = parseChittorgarhIpoReviewTable(html);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.extra?.consensus).toEqual({
      apply: 10,
      mayApply: 2,
      neutral: 1,
      avoid: 0,
      notRated: 3,
      netScore: 10,
    });
    expect(consensusToReco(rows[0]!.extra!.consensus as never)).toBe("BUY");
  });
});

describe("normalizeReco", () => {
  it("maps strong buy to BUY", () => {
    expect(normalizeReco("Strong Buy")).toBe("BUY");
    expect(normalizeReco("NEUTRAL")).toBe("HOLD");
  });
});
