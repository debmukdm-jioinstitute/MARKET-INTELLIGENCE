import { describe, expect, it } from "vitest";
import { isUsefulRssItem } from "@/lib/promoters/fetch-feed";
import { nseDateToIso } from "@/lib/promoters/nse-native";

const NOW = Date.parse("2026-10-08T12:00:00Z");

describe("isUsefulRssItem", () => {
  it("keeps recent promoter news", () => {
    expect(isUsefulRssItem("AXISCADES Technologies promoter releases 27,000 shares from pledge", "2026-10-07", NOW)).toBe(true);
  });
  it("drops site-chrome and filing-letter junk", () => {
    expect(isUsefulRssItem("Untitled - NSE India", "2026-10-06", NOW)).toBe(false);
    expect(isUsefulRssItem("USD/INR: Exchange Rate, Forecast, Chart, News & Analysis- NSE India", "2026-10-06", NOW)).toBe(false);
    expect(isUsefulRssItem("The Corporate Service Department BSE Limited P J Towers", "2026-10-07", NOW)).toBe(false);
    expect(isUsefulRssItem("October 07, 2026 To, The Manager Listing Department", "2026-10-07", NOW)).toBe(false);
  });
  it("drops items older than 30 days", () => {
    expect(isUsefulRssItem("Promoter sells 2% stake in Acme Industries", "2020-01-11", NOW)).toBe(false);
  });
});

describe("nseDateToIso", () => {
  it("parses NSE date shapes", () => {
    expect(nseDateToIso("08-Oct-2026")).toBe("2026-10-08");
    expect(nseDateToIso("29-SEP-2026 to 29-SEP-2026")).toBe("2026-09-29");
    expect(nseDateToIso("08-Oct-2026 16:31:07")).toBe("2026-10-08");
    expect(nseDateToIso(null)).toBeNull();
  });
});

import { parsePitXbrl } from "@/lib/promoters/nse-native";

describe("parsePitXbrl", () => {
  it("groups tags by disclosure context", () => {
    const xml = `<in-bse-co:NameOfThePerson contextRef="Disclosure1">A B</in-bse-co:NameOfThePerson>
      <in-bse-co:SecuritiesAcquiredOrDisposedNumberOfSecurity contextRef="Disclosure1" unitRef="shares">2101</in-bse-co:SecuritiesAcquiredOrDisposedNumberOfSecurity>
      <in-bse-co:NameOfThePerson contextRef="Disclosure2">C D</in-bse-co:NameOfThePerson>
      <in-bse-co:Symbol contextRef="MainI">X</in-bse-co:Symbol>`;
    const r = parsePitXbrl(xml);
    expect(r.Disclosure1!.NameOfThePerson).toBe("A B");
    expect(r.Disclosure1!.SecuritiesAcquiredOrDisposedNumberOfSecurity).toBe("2101");
    expect(r.Disclosure2!.NameOfThePerson).toBe("C D");
    expect(r.MainI).toBeUndefined();
  });
});
