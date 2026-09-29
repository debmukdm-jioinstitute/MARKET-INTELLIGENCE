import { describe, expect, it } from "vitest";
import {
  parseStatementRows,
  textToRows,
  findHeaderRow,
  detectBrokerage,
  parseExcelBuffer,
} from "@/lib/brokers/universal-statement-parser";
import ExcelJS from "exceljs";

describe("Universal Statement Parser", () => {
  it("parses standard Zerodha Console holdings CSV with preambles and footer", async () => {
    const rawCsv = `
ZERODHA BROKING LTD.
Client ID: AB1234
Holdings report as on 28-Sep-2026

Instrument,ISIN,Qty.,Avg. cost,LTP,Cur. val,P&L,Net chg,Day chg
RELIANCE,INE002A01018,50,2850.50,2900.00,145000.00,2475.00,1.73%,0.5%
TCS,INE467B01029,20,3800.00,3950.00,79000.00,3000.00,3.94%,-0.2%
INFY,INE009A01021,100,1450.25,1500.00,150000.00,4975.00,3.43%,0.8%

Total,,,,,,,374000.00,
* Notes: Holdings include DP and T1.
`;

    const rows = textToRows(rawCsv);
    const result = await parseStatementRows(rows, rawCsv);

    expect(result.success).toBe(true);
    expect(result.brokerDetected).toBe("Zerodha");
    expect(result.statementType).toBe("holdings");
    expect(result.holdings).toHaveLength(3);

    const rel = result.holdings.find((h) => h.symbol === "RELIANCE");
    expect(rel).toBeDefined();
    expect(rel?.shares).toBe(50);
    expect(rel?.avgCost).toBe(2850.5);
    expect(rel?.name).toBe("Reliance Industries");
    expect(rel?.instrumentKey).toBe("NSE_EQ|INE002A01018");

    const tcs = result.holdings.find((h) => h.symbol === "TCS");
    expect(tcs).toBeDefined();
    expect(tcs?.shares).toBe(20);
    expect(tcs?.avgCost).toBe(3800);
  });

  it("parses Zerodha tradebook CSV and nets buy/sell trades into active holdings", async () => {
    const rawTradebook = `
symbol,isin,trade_date,exchange,segment,series,trade_type,quantity,price,order_id,trade_id,order_execution_time
HDFCBANK,INE040A01034,2026-01-10,NSE,EQ,EQ,buy,100,1600.00,101,201,10:00:00
HDFCBANK,INE040A01034,2026-02-15,NSE,EQ,EQ,buy,50,1700.00,102,202,11:00:00
HDFCBANK,INE040A01034,2026-03-01,NSE,EQ,EQ,sell,50,1750.00,103,203,12:00:00
WIPRO,INE075A01022,2026-01-05,NSE,EQ,EQ,buy,200,450.00,104,204,09:30:00
WIPRO,INE075A01022,2026-02-20,NSE,EQ,EQ,sell,200,480.00,105,205,14:00:00
`;

    const rows = textToRows(rawTradebook);
    const result = await parseStatementRows(rows, rawTradebook);

    expect(result.success).toBe(true);
    expect(result.statementType).toBe("tradebook");
    expect(result.totalTradesProcessed).toBe(5);

    expect(result.holdings).toHaveLength(1);
    const hdfc = result.holdings[0];
    expect(hdfc.symbol).toBe("HDFCBANK");
    expect(hdfc.shares).toBe(100);
    expect(hdfc.avgCost).toBeCloseTo(1633.33, 1);
  });

  it("parses Groww format holdings statement", async () => {
    const rawCsv = `
Groww Holdings Report
Generated on 25 Sep 2026

Stock Name,Symbol,ISIN,Shares,Average Price,Current Value
Tata Consultancy Services,TCS,INE467B01029,15,3750.00,56250.00
State Bank of India,SBIN,INE062A01020,40,780.50,31220.00
`;

    const rows = textToRows(rawCsv);
    const result = await parseStatementRows(rows, rawCsv);

    expect(result.success).toBe(true);
    expect(result.brokerDetected).toBe("Groww");
    expect(result.holdings).toHaveLength(2);
    expect(result.holdings[0].symbol).toBe("TCS");
    expect(result.holdings[0].shares).toBe(15);
    expect(result.holdings[1].symbol).toBe("SBIN");
    expect(result.holdings[1].shares).toBe(40);
  });

  it("parses ICICI Direct Equity Portfolio statement", async () => {
    const rawCsv = `
ICICIdirect Equity Portfolio Statement
Account: XXXXXX9872

Stock Symbol,Company Name,ISIN Code,Quantity,Average Cost Price,Current Market Price
INFY,Infosys Limited,INE009A01021,25,1420.00,1500.00
ITC,ITC Limited,INE154A01025,100,430.20,440.00
`;

    const rows = textToRows(rawCsv);
    const result = await parseStatementRows(rows, rawCsv);

    expect(result.success).toBe(true);
    expect(result.brokerDetected).toBe("ICICI Direct");
    expect(result.holdings).toHaveLength(2);
    expect(result.holdings.find((h) => h.symbol === "INFY")?.shares).toBe(25);
    expect(result.holdings.find((h) => h.symbol === "ITC")?.shares).toBe(100);
  });

  it("parses tab-separated pasted text from web portals", async () => {
    const rawTsv = "Symbol\tQuantity\tAvg Price\nLT\t30\t3500.00\nTITAN\t10\t3200.50";
    const rows = textToRows(rawTsv);
    const result = await parseStatementRows(rows, rawTsv);

    expect(result.success).toBe(true);
    expect(result.holdings).toHaveLength(2);
    expect(result.holdings[0].symbol).toBe("LT");
    expect(result.holdings[0].shares).toBe(30);
    expect(result.holdings[1].symbol).toBe("TITAN");
    expect(result.holdings[1].shares).toBe(10);
  });

  it("parses binary Excel .xlsx files", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Holdings");
    ws.addRow(["Angel One Portfolio Holdings", "", "", ""]);
    ws.addRow(["Client: A12345", "", "", ""]);
    ws.addRow(["Symbol", "Company Name", "Quantity", "Buy Price"]);
    ws.addRow(["SUNPHARMA", "Sun Pharmaceutical", 45, 1620.0]);
    ws.addRow(["MARUTI", "Maruti Suzuki", 8, 12500.0]);

    const buf = await wb.xlsx.writeBuffer();
    const { rows } = await parseExcelBuffer(buf as any);
    const result = await parseStatementRows(rows, "Angel One Portfolio");

    expect(result.success).toBe(true);
    expect(result.brokerDetected).toBe("Angel One");
    expect(result.holdings).toHaveLength(2);
    expect(result.holdings[0].symbol).toBe("SUNPHARMA");
    expect(result.holdings[0].shares).toBe(45);
    expect(result.holdings[1].symbol).toBe("MARUTI");
    expect(result.holdings[1].shares).toBe(8);
  });

  it("parses US equities and handles currency symbols", async () => {
    const rawCsv = "Symbol,Shares,Cost Basis\nAAPL,15,$175.50\nMSFT,10,$410.20\nNVDA,25,$120.00";
    const rows = textToRows(rawCsv);
    const result = await parseStatementRows(rows, rawCsv);

    expect(result.success).toBe(true);
    expect(result.holdings).toHaveLength(3);
    const aapl = result.holdings.find((h) => h.symbol === "AAPL");
    expect(aapl?.market).toBe("US");
    expect(aapl?.currency).toBe("USD");
    expect(aapl?.avgCost).toBe(175.5);
  });

  it("merges multiple lots of the same stock using weighted average price", async () => {
    const rawCsv = "Symbol,Quantity,Price\nINFY,50,1400.00\nINFY,50,1500.00";
    const rows = textToRows(rawCsv);
    const result = await parseStatementRows(rows, rawCsv);

    expect(result.success).toBe(true);
    expect(result.holdings).toHaveLength(1);
    expect(result.holdings[0].symbol).toBe("INFY");
    expect(result.holdings[0].shares).toBe(100);
    expect(result.holdings[0].avgCost).toBe(1450.0);
  });
});
