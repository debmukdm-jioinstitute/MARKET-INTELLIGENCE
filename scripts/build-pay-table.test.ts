import { expect, it } from "vitest";
import { completedFy, filingList, parseCsv } from "./build-pay-table.mjs";
import { filingDateIso } from "../src/lib/research/brsr-pay.mjs";
it("reads quoted company names without corrupting symbol columns", () => expect(parseCsv('Company Name,Symbol\n"Acme, Ltd",ACME')[1][1]).toBe("ACME"));
it("uses the latest completed Indian financial year", () => { expect(completedFy(new Date("2026-03-30"))).toBe("FY25"); expect(completedFy(new Date("2026-04-01"))).toBe("FY26"); });
it("preserves NSE calendar filing dates across timezones and rejects invalid dates", () => {
  expect(filingDateIso("01-Jun-2026 22:03:00")).toBe("2026-06-01");
  expect(filingDateIso("2026-06-01T00:10:00+05:30")).toBe("2026-06-01");
  expect(filingDateIso("31-Feb-2026")).toBeNull(); expect(filingDateIso("-")).toBeNull();
});
it("sorts revised filings by FY/date and retains earlier years", () => {
  const data = [{ symbol: "ACME", fyTo: 2025, attachmentFile: "https://nsearchives.nseindia.com/a.pdf", submissionDate: "01-Jun-2025" }, { symbol: "ACME", fyTo: 2026, attachmentFile: "https://nsearchives.nseindia.com/b.pdf", revisionDate: "03-Jul-2026", submissionDate: "01-Jun-2026" }];
  expect(filingList({ data }, "ACME").map((f) => f.fy)).toEqual(["FY26", "FY25"]);
  expect(filingList({ data }, "ACME")[0].filingDate).toBe("2026-07-03");
});
it("does not convert catalogue errors or private source links into not-filed evidence", () => { expect(() => filingList({ error: "blocked" }, "ACME")).toThrow(); expect(() => filingList({ data: [{ fyTo: 2026, attachmentFile: "https://127.0.0.1/x.pdf" }] }, "ACME")).toThrow(); });
it("distinguishes a confirmed empty list from a nonempty list without usable attachments", () => {
  expect(filingList([], "ACME")).toEqual([]);
  expect(() => filingList([{ symbol: "ACME", fyTo: 2026 }], "ACME")).toThrow();
  expect(() => filingList([{ symbol: "OTHER", fyTo: 2026, attachmentFile: "https://nsearchives.nseindia.com/test.pdf" }], "ACME")).toThrow();
});
it("keeps the newest amendment without exhausting prior-year fallback slots", () => {
  const data = [1, 2, 3, 4].map(day => ({ fyTo: 2026, attachmentFile: `https://nsearchives.nseindia.com/revision${day}.pdf`, revisionDate: `0${day}-Jun-2026` }));
  const previous = { fyTo: 2025, attachmentFile: "https://nsearchives.nseindia.com/prior.pdf", revisionDate: "01-Jun-2025" };
  const files = filingList({ data: [...data, previous] }, "ACME").slice(0, 3);
  expect(files.map(f => f.fy)).toEqual(["FY26", "FY25"]);
  expect(files[0].sourceUrl).toContain("revision4.pdf");
});
