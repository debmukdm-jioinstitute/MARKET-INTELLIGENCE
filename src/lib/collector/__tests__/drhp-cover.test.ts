import { describe, expect, it } from "vitest";
import { extractBrlms, extractCover, scanBankers } from "../drhp-cover";

const INOX_P0 = `DETAILS OF THE OFFER TO THE PUBLIC Type Fresh issue size Offer for Sale size Total Offer size
Offer for Sale Not applicable Offer for sale of up to 77,156,663 equity shares of face value ₹1 each aggregating to ₹[●] million
Up to 77,156,663 equity shares of face value of ₹1 each aggregating to ₹[●] million`;
const INOX_P1 = `BOOK RUNNING LEAD MANAGERS Name of the BRLMs and Logo Contact Person Email and Telephone
Kotak Mahindra Capital Company Limited Ganesh Rane E-mail: a@kotak.com Tel.: +91 22 4336 0000
Citigroup Global Markets India Private Limited Nilay Kala
ICICI Securities Limited Rahul Sharma / Sumit Singh
J. P. Morgan India Private Limited Varun Agrawal
REGISTRAR TO THE OFFER Name and logo of the Registrar MUFG Intime India Private Limited`;
const ELECTROMECH_P0 = `DETAILS OF OFFER TO THE PUBLIC TYPE FRESH ISSUE# OFFER FOR SALE
Fresh Issue of up to [●] Equity Shares of face value of ₹5 each aggregating up to ₹ 32,600 lakhs
Offer for Sale of up to 18,91,000 Equity Shares of face value of ₹5 each aggregating up to ₹ [●] lakhs`;
const ELECTROMECH_P1 = `BOOK RUNNING LEAD MANAGER NAME OF BRLM AND LOGO CONTACT PERSON E-MAIL AND TELEPHONE
Arihant Capital Markets Limited Amol Kshirsagar Telephone: +91 22 4225 4800
REGISTRAR TO THE OFFER Bigshare Services Private Limited`;

describe("drhp cover", () => {
  it("reads lead managers with the banker trie", () => {
    expect(extractBrlms([INOX_P0, INOX_P1])).toEqual(["Kotak Mahindra Capital", "Citi", "ICICI Securities", "J.P. Morgan"]);
  });
  it("prefers the longest dictionary phrase", () => {
    expect(scanBankers("Motilal Oswal Investment Advisors Limited and IIFL Capital Services Limited")).toEqual(["Motilal Oswal", "IIFL Capital"]);
  });
  it("falls back to the generic Limited pattern for unknown bankers", () => {
    expect(extractBrlms(["BOOK RUNNING LEAD MANAGER NAME CONTACT PERSON E-MAIL AND TELEPHONE Zenith Merchant Banking Limited Jane Doe Telephone: 1 REGISTRAR TO THE OFFER"])).toEqual(["Zenith Merchant Banking"]);
  });
  it("keeps [●] amounts null and share counts when only shares are stated (Inox)", () => {
    const { offer } = extractCover([INOX_P0, INOX_P1]);
    expect(offer).toMatchObject({ freshIssueCr: null, ofsShares: 77156663, ofsCr: null, totalOfferCr: null, structure: "ofs" });
  });
  it("converts lakhs to crore and parses Indian digit grouping (Electromech)", () => {
    const c = extractCover([ELECTROMECH_P0, ELECTROMECH_P1]);
    expect(c.offer).toMatchObject({ freshIssueCr: 326, ofsShares: 1891000, structure: "fresh+ofs" });
    expect(c.brlms).toEqual(["Arihant Capital"]);
  });
  it("handles million and no cover", () => {
    expect(extractCover(["Fresh Issue of up to [●] Equity Shares aggregating up to ₹ 5,000 million"]).offer.freshIssueCr).toBe(500);
    expect(extractCover([""]).brlms).toEqual([]);
  });
});
