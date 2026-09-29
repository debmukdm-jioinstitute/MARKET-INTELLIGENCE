import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    regulations: [
      {
        code: "SEBI PIT Reg 7(2)",
        title: "Prohibition of Insider Trading (PIT) Regulations, 2015",
        threshold: "Transactions exceeding ₹10 Lakhs within a calendar quarter by Promoters, Directors, and Designated Persons must be disclosed within 2 trading days.",
        authority: "Securities and Exchange Board of India (SEBI)",
        portalUrl: "https://www.sebi.gov.in/",
      },
      {
        code: "SEBI SAST Reg 29",
        title: "Substantial Acquisition of Shares and Takeovers (SAST) Regulations, 2011",
        threshold: "Any person acquiring or disposing shares resulting in holding change of 2% or crossing 5%, 10%, 15% thresholds must disclose within 2 working days.",
        authority: "SEBI & Stock Exchanges (NSE/BSE)",
        portalUrl: "https://www.nseindia.com/companies-listing/corporate-filings-insider-trading",
      },
      {
        code: "SEBI SAST Reg 31",
        title: "Encumbrance / Pledge Disclosures",
        threshold: "Promoters must disclose creation, invocation, or release of pledge on shares within 7 working days.",
        authority: "NSE & BSE Corporate Disclosures",
        portalUrl: "https://www.bseindia.com/corporates/shpSecurities.aspx",
      },
      {
        code: "NSE Block Deal Window",
        title: "Dedicated Block Trading Window (Circular SEBI/HO/MRD/DSA/CIR/P/2017/148)",
        threshold: "Minimum trade value of ₹10 Crores executed during morning (08:45 - 09:00 AM) or afternoon (02:05 - 02:20 PM) windows within ±1% reference price.",
        authority: "National Stock Exchange of India",
        portalUrl: "https://www.nseindia.com/market-data/block-deal-watch",
      },
      {
        code: "NSE Bulk Deal Window",
        title: "Bulk Deals Reporting",
        threshold: "Transactions where total quantity bought or sold is greater than 0.5% of total listed equity on normal trading session.",
        authority: "NSE & BSE Bulk Deals",
        portalUrl: "https://www.nseindia.com/market-data/bulk-deal-watch",
      }
    ],
    status: "ACTIVE_STREAMING",
    asOf: "September 2026",
  });
}
