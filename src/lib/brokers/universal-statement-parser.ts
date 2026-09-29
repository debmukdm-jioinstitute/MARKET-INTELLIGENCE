import ExcelJS from "exceljs";
import { INDIA_EQUITIES } from "@/lib/feeds/india/instruments";
import { resolveSymbol } from "@/lib/feeds/symbol-search";
import type { Holding } from "@/lib/my-portfolio/types";
import { UNIVERSE } from "@/lib/universe";

export type ParsedStatementResult = {
  success: boolean;
  holdings: Holding[];
  brokerDetected: string;
  statementType: "holdings" | "tradebook" | "generic";
  totalPositions: number;
  totalInvested: number;
  totalTradesProcessed?: number;
  warnings?: string[];
};

export type StatementParseOptions = {
  brokerHint?: string;
  defaultMarket?: "IN" | "US";
};

// ---------------------------------------------------------------------------
// Delimiter & Line Parsing
// ---------------------------------------------------------------------------

export function detectDelimiter(text: string): string {
  const sampleLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 25);

  if (sampleLines.length === 0) return ",";

  const counts: Record<string, number> = { ",": 0, "\t": 0, ";": 0, "|": 0 };
  for (const line of sampleLines) {
    for (const d of [",", "\t", ";", "|"]) {
      const parts = line.split(d);
      if (parts.length > 1) {
        counts[d] = (counts[d] || 0) + (parts.length - 1);
      }
    }
  }

  let best = ",";
  let max = 0;
  for (const [delim, count] of Object.entries(counts)) {
    if (count > max) {
      max = count;
      best = delim;
    }
  }
  return best;
}

export function parseDelimitedLine(text: string, delim = ","): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delim && !inQuotes) {
      result.push(cur.trim().replace(/^"|"$/g, ""));
      cur = "";
    } else {
      cur += char;
    }
  }
  result.push(cur.trim().replace(/^"|"$/g, ""));
  return result;
}

export function textToRows(text: string): string[][] {
  const delim = detectDelimiter(text);
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => parseDelimitedLine(l, delim));
}

// ---------------------------------------------------------------------------
// Excel Workbook Parser
// ---------------------------------------------------------------------------

export async function parseExcelBuffer(
  buffer: ArrayBuffer | Buffer
): Promise<{ rows: string[][]; sheetName: string }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);

  let targetSheet = wb.worksheets[0];
  const preferred = [
    "holdings",
    "portfolio",
    "trades",
    "transactions",
    "equity",
    "stocks",
    "scrip",
    "positions",
  ];

  for (const ws of wb.worksheets) {
    const name = ws.name.toLowerCase();
    if (preferred.some((p) => name.includes(p))) {
      targetSheet = ws;
      break;
    }
  }

  if (!targetSheet) {
    throw new Error("No readable worksheet found in the uploaded Excel file.");
  }

  const rows: string[][] = [];
  targetSheet.eachRow({ includeEmpty: false }, (row) => {
    const rowValues = Array.isArray(row.values)
      ? row.values.slice(1)
      : Object.values(row.values || {});

    const cleanRow = rowValues.map((val) => {
      if (val === null || val === undefined) return "";
      if (typeof val === "object") {
        if ("result" in val && (val as any).result !== undefined) {
          return String((val as any).result).trim();
        }
        if ("richText" in val && Array.isArray((val as any).richText)) {
          return (val as any).richText.map((t: any) => t.text).join("").trim();
        }
        if (val instanceof Date) return val.toISOString().slice(0, 10);
      }
      return String(val).trim();
    });

    if (cleanRow.some((c) => c.length > 0)) {
      rows.push(cleanRow);
    }
  });

  return { rows, sheetName: targetSheet.name };
}

// ---------------------------------------------------------------------------
// Header Concept Matching & Scoring
// ---------------------------------------------------------------------------

function normalizeHeaderToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/[._\-/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isExplicitTickerCol(t: string): boolean {
  return (
    t === "symbol" ||
    t === "ticker" ||
    t === "tradingsymbol" ||
    t === "trading symbol" ||
    t === "stock symbol" ||
    t === "scrip code" ||
    t === "instrument" ||
    t === "instrument symbol" ||
    t === "nse symbol" ||
    t === "bse symbol"
  );
}

function isNameCol(t: string): boolean {
  return (
    t === "company name" ||
    t === "name" ||
    t === "stock name" ||
    t === "scrip name" ||
    t === "security name" ||
    t === "company" ||
    t === "description" ||
    t === "security description"
  );
}

function isFallbackSymbolCol(t: string): boolean {
  return (
    t === "stock" ||
    t === "scrip" ||
    t === "security" ||
    (t.includes("symbol") && !t.includes("name"))
  );
}

function isQtyCol(t: string): boolean {
  return (
    t === "qty" ||
    t === "qty." ||
    t === "quantity" ||
    t === "shares" ||
    t === "total qty" ||
    t === "total quantity" ||
    t === "available qty" ||
    t === "net qty" ||
    t === "units" ||
    t === "balance" ||
    t === "holdings" ||
    t === "pos" ||
    t === "position" ||
    t.includes("qty") ||
    t.includes("quantity") ||
    t.includes("shares")
  );
}

function isBuyPriceCol(t: string): boolean {
  // Must NOT be current market price or closing price
  if (
    t.includes("current") ||
    t.includes("market price") ||
    t.includes("ltp") ||
    t.includes("close") ||
    t.includes("cmp") ||
    t.includes("valuation") ||
    t.includes("market value")
  ) {
    return false;
  }

  return (
    t.includes("avg") ||
    t.includes("average") ||
    t.includes("cost") ||
    t.includes("buy") ||
    t.includes("purchase") ||
    t.includes("rate") ||
    t === "price" ||
    t === "trade price" ||
    t === "execution price"
  );
}

function isCurrentPriceCol(t: string): boolean {
  return (
    t === "ltp" ||
    t === "last price" ||
    t === "cmp" ||
    t === "current price" ||
    t === "market price" ||
    t === "close price" ||
    t.includes("current price") ||
    t.includes("market price") ||
    t.includes("ltp")
  );
}

function isActionCol(t: string): boolean {
  return (
    t === "action" ||
    t === "trade type" ||
    t === "trade_type" ||
    t === "type" ||
    t === "buy/sell" ||
    t === "b/s" ||
    t === "side" ||
    t === "transaction type" ||
    t === "order type" ||
    t === "tran type" ||
    t === "activity"
  );
}

function isIsinCol(t: string): boolean {
  return (
    t === "isin" ||
    t === "isin code" ||
    t === "security isin" ||
    t.includes("isin")
  );
}

function isDateCol(t: string): boolean {
  return (
    t === "date" ||
    t === "trade date" ||
    t === "order date" ||
    t === "trade_date" ||
    t === "execution date" ||
    t === "transaction date" ||
    t.includes("date")
  );
}

// ---------------------------------------------------------------------------
// Header Detector & Column Mapping
// ---------------------------------------------------------------------------

export type ColumnMapping = {
  headerRowIndex: number;
  symbolCol: number;
  nameCol?: number;
  qtyCol: number;
  priceCol: number;
  actionCol?: number;
  isinCol?: number;
  dateCol?: number;
  currentPriceCol?: number;
  isTradebook: boolean;
};

export function findHeaderRow(rows: string[][]): ColumnMapping | null {
  const maxScan = Math.min(rows.length, 35);
  let bestScore = -1;
  let bestMapping: ColumnMapping | null = null;

  for (let r = 0; r < maxScan; r++) {
    const rawCols = rows[r] || [];
    const tokens = rawCols.map(normalizeHeaderToken);

    let explicitTickerCol = -1;
    let fallbackSymCol = -1;
    let nameCol = -1;
    let qtyCol = -1;
    let priceCol = -1;
    let actionCol = -1;
    let isinCol = -1;
    let dateCol = -1;
    let currentPriceCol = -1;

    for (let c = 0; c < tokens.length; c++) {
      const tok = tokens[c];
      if (!tok) continue;

      if (explicitTickerCol === -1 && isExplicitTickerCol(tok)) {
        explicitTickerCol = c;
      } else if (nameCol === -1 && isNameCol(tok)) {
        nameCol = c;
      } else if (fallbackSymCol === -1 && isFallbackSymbolCol(tok)) {
        fallbackSymCol = c;
      }

      if (qtyCol === -1 && isQtyCol(tok)) {
        qtyCol = c;
      }

      if (priceCol === -1 && isBuyPriceCol(tok)) {
        priceCol = c;
      } else if (currentPriceCol === -1 && isCurrentPriceCol(tok)) {
        currentPriceCol = c;
      }

      if (actionCol === -1 && isActionCol(tok)) {
        actionCol = c;
      }
      if (isinCol === -1 && isIsinCol(tok)) {
        isinCol = c;
      }
      if (dateCol === -1 && isDateCol(tok)) {
        dateCol = c;
      }
    }

    // Determine final symbolCol: explicit ticker wins over fallback, which wins over name
    let symbolCol = explicitTickerCol;
    if (symbolCol === -1) {
      symbolCol = fallbackSymCol !== -1 ? fallbackSymCol : nameCol;
    }

    const isTradebook = actionCol !== -1;
    let score = 0;

    if (symbolCol !== -1) score += 4;
    if (qtyCol !== -1) score += 3;
    if (priceCol !== -1) score += 3;
    if (isTradebook) score += 2;
    if (isinCol !== -1) score += 1;
    if (nameCol !== -1 && nameCol !== symbolCol) score += 1;

    // Minimum criteria: Must have symbol and (qty or (isTradebook && price))
    if (symbolCol !== -1 && (qtyCol !== -1 || (isTradebook && priceCol !== -1))) {
      if (score > bestScore) {
        bestScore = score;
        bestMapping = {
          headerRowIndex: r,
          symbolCol,
          nameCol: nameCol !== -1 && nameCol !== symbolCol ? nameCol : undefined,
          qtyCol,
          priceCol,
          actionCol: isTradebook ? actionCol : undefined,
          isinCol: isinCol !== -1 ? isinCol : undefined,
          dateCol: dateCol !== -1 ? dateCol : undefined,
          currentPriceCol: currentPriceCol !== -1 ? currentPriceCol : undefined,
          isTradebook,
        };
      }
    }
  }

  return bestMapping;
}

// ---------------------------------------------------------------------------
// Numeric & String Helpers
// ---------------------------------------------------------------------------

export function cleanNumber(val: unknown): number {
  if (typeof val === "number") return val;
  if (!val) return 0;
  let str = String(val).trim();
  const isParenNeg = /^\((.*)\)$/.test(str);
  str = str.replace(/[₹$,() ]/g, "").replace(/\s+/g, "");
  const num = parseFloat(str);
  if (isNaN(num)) return 0;
  return isParenNeg ? -Math.abs(num) : num;
}

export function cleanSymbol(raw: string): string {
  if (!raw) return "";
  let s = raw.trim().toUpperCase();

  // Remove common prefixes
  s = s.replace(/^(NSE|BSE):/, "");

  // Remove suffixes
  s = s
    .replace(/-EQ$/, "")
    .replace(/-BE$/, "")
    .replace(/-BZ$/, "")
    .replace(/\.NS$/, "")
    .replace(/\.BO$/, "")
    .replace(/\s+EQ$/, "");

  // If text is in format: "TATA CONSULTANCY SERVICES LTD (TCS)" -> extract "TCS"
  const parenMatch = s.match(/\(([^)]+)\)$/);
  if (parenMatch && parenMatch[1] && parenMatch[1].length <= 15) {
    s = parenMatch[1].trim();
  }

  return s.trim();
}

export function cleanIsin(raw: unknown): string | null {
  if (!raw) return null;
  const s = String(raw).trim().toUpperCase();
  const isinRegex = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
  return isinRegex.test(s) ? s : null;
}

// ---------------------------------------------------------------------------
// Broker Detection
// ---------------------------------------------------------------------------

export function detectBrokerage(
  rows: string[][],
  rawText: string,
  hint?: string
): string {
  if (hint && hint !== "auto" && hint !== "generic") {
    return hint;
  }

  const combined = (
    rows.slice(0, 10).map((r) => r.join(" ")).join(" ") +
    " " +
    rawText.slice(0, 1500)
  ).toLowerCase();

  if (combined.includes("zerodha") || combined.includes("kite") || combined.includes("console.zerodha")) {
    return "Zerodha";
  }
  if (combined.includes("groww") || combined.includes("nextbillion")) {
    return "Groww";
  }
  if (combined.includes("angel") || combined.includes("angelone") || combined.includes("angel broking")) {
    return "Angel One";
  }
  if (combined.includes("icici") || combined.includes("icicidirect")) {
    return "ICICI Direct";
  }
  if (combined.includes("hdfc") || combined.includes("hdfc sky") || combined.includes("hdfcsec")) {
    return "HDFC Sky / Securities";
  }
  if (combined.includes("kotak") || combined.includes("kotaksecurities")) {
    return "Kotak Securities";
  }
  if (combined.includes("motilal") || combined.includes("mosl")) {
    return "Motilal Oswal";
  }
  if (combined.includes("upstox") || combined.includes("rksv")) {
    return "Upstox";
  }
  if (combined.includes("dhan") || combined.includes("moneylicious")) {
    return "Dhan";
  }
  if (combined.includes("5paisa")) {
    return "5paisa";
  }
  if (combined.includes("shoonya") || combined.includes("finvasia")) {
    return "Shoonya (Finvasia)";
  }
  if (combined.includes("interactive brokers") || combined.includes("ibkr")) {
    return "Interactive Brokers";
  }
  if (combined.includes("schwab")) {
    return "Charles Schwab";
  }
  if (combined.includes("fidelity")) {
    return "Fidelity";
  }

  return "Brokerage House";
}

// ---------------------------------------------------------------------------
// Enrichment
// ---------------------------------------------------------------------------

async function enrichRow(
  rawSym: string,
  rawName: string | undefined,
  isin: string | null,
  shares: number,
  avgCost: number,
  index: number,
  broker: string
): Promise<Holding | null> {
  const sym = cleanSymbol(rawSym);
  if (!sym || sym.length > 25) return null;

  // Curated India match
  const curatedIndia = INDIA_EQUITIES.find(
    (e) =>
      e.symbol.toUpperCase() === sym ||
      (isin && e.isin.toUpperCase() === isin.toUpperCase())
  );

  // US Universe match
  const usMatch = UNIVERSE.find((u) => u.symbol.toUpperCase() === sym);

  let market: "IN" | "US" = "IN";
  let currency: "INR" | "USD" = "INR";
  let name = rawName?.trim() || sym;
  let sector: string | null = null;
  let instrumentKey: string | null = null;

  if (curatedIndia) {
    market = "IN";
    currency = "INR";
    name = curatedIndia.name;
    sector = curatedIndia.sector;
    instrumentKey = isin ? `NSE_EQ|${isin}` : curatedIndia.instrumentKey;
  } else if (usMatch) {
    market = "US";
    currency = "USD";
    name = usMatch.name;
    sector = usMatch.sector;
    instrumentKey = null;
  } else {
    // Check ISIN nationality
    if (isin && isin.startsWith("US")) {
      market = "US";
      currency = "USD";
    }

    // Try resolving through symbol-search index
    try {
      const resolved = await resolveSymbol(sym);
      if (resolved) {
        name = resolved.name || name;
        market = resolved.market;
        currency = resolved.market === "US" ? "USD" : "INR";
        if (resolved.instrumentKey) {
          instrumentKey = resolved.instrumentKey;
        } else if (resolved.isin) {
          instrumentKey = `NSE_EQ|${resolved.isin}`;
        }
      }
    } catch {
      // offline/graceful fallback
    }

    if (!instrumentKey && isin) {
      instrumentKey = market === "IN" ? `NSE_EQ|${isin}` : null;
    }
  }

  const prefix = broker.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6) || "broker";
  const today = new Date().toISOString().slice(0, 10);

  return {
    id: `${prefix}-${sym}-${Date.now()}-${index}`,
    market,
    symbol: sym,
    instrumentKey,
    name,
    sector,
    currency,
    shares: Math.round(shares * 1000) / 1000,
    avgCost: Math.round(avgCost * 100) / 100,
    addedAt: today,
  };
}

// ---------------------------------------------------------------------------
// Core Universal Parser
// ---------------------------------------------------------------------------

export async function parseStatementRows(
  rows: string[][],
  rawText = "",
  options: StatementParseOptions = {}
): Promise<ParsedStatementResult> {
  if (!rows || rows.length < 2) {
    throw new Error("Statement is empty or contains insufficient data.");
  }

  const mapping = findHeaderRow(rows);
  if (!mapping) {
    throw new Error(
      "Could not detect valid table columns. Your statement file must contain columns for Symbol/Stock, Quantity, and Average Cost or Buy Price."
    );
  }

  const brokerDetected = detectBrokerage(rows, rawText, options.brokerHint);
  const dataRows = rows.slice(mapping.headerRowIndex + 1);

  if (mapping.isTradebook && mapping.actionCol !== undefined) {
    // -----------------------------------------------------------------------
    // Tradebook / Transaction Log Processing
    // -----------------------------------------------------------------------
    type Pos = {
      symbol: string;
      name?: string;
      isin?: string | null;
      shares: number;
      totalCost: number;
    };

    const book = new Map<string, Pos>();
    let tradesCount = 0;

    for (const r of dataRows) {
      if (r.length <= Math.max(mapping.symbolCol, mapping.qtyCol, mapping.priceCol)) {
        continue;
      }

      const rawSym = r[mapping.symbolCol]?.trim();
      const rawAction = r[mapping.actionCol]?.trim().toLowerCase();
      const shares = Math.abs(cleanNumber(r[mapping.qtyCol]));
      const price = Math.abs(cleanNumber(r[mapping.priceCol]));
      const isin = mapping.isinCol !== undefined ? cleanIsin(r[mapping.isinCol]) : null;
      const rawName = mapping.nameCol !== undefined ? r[mapping.nameCol]?.trim() : undefined;

      if (!rawSym || shares <= 0 || price <= 0) continue;

      const sym = cleanSymbol(rawSym);
      if (!sym) continue;

      const isBuy =
        rawAction.includes("buy") ||
        rawAction === "b" ||
        rawAction.includes("purchase") ||
        rawAction.includes("bought") ||
        rawAction.includes("receipt") ||
        rawAction === "dr";

      const isSell =
        rawAction.includes("sell") ||
        rawAction === "s" ||
        rawAction.includes("sold") ||
        rawAction.includes("sale") ||
        rawAction.includes("delivery") ||
        rawAction === "cr";

      if (!isBuy && !isSell) continue;

      tradesCount++;
      const cur = book.get(sym) || {
        symbol: sym,
        name: rawName,
        isin,
        shares: 0,
        totalCost: 0,
      };

      if (isBuy) {
        cur.shares += shares;
        cur.totalCost += shares * price;
      } else if (isSell) {
        const sold = Math.min(cur.shares, shares);
        const avg = cur.shares > 0 ? cur.totalCost / cur.shares : price;
        cur.shares -= sold;
        cur.totalCost = Math.max(0, cur.shares * avg);
      }

      book.set(sym, cur);
    }

    const netPositions = Array.from(book.values()).filter(
      (p) => p.shares > 0 && p.totalCost > 0
    );

    if (netPositions.length === 0) {
      throw new Error(
        `Parsed ${tradesCount} transactions, but found no open/active holding positions (all positions may have been sold or have zero balance).`
      );
    }

    const holdings: Holding[] = [];
    let idx = 0;
    for (const p of netPositions) {
      const avgCost = p.totalCost / p.shares;
      const enriched = await enrichRow(
        p.symbol,
        p.name,
        p.isin || null,
        p.shares,
        avgCost,
        idx++,
        brokerDetected
      );
      if (enriched) holdings.push(enriched);
    }

    const totalInvested = holdings.reduce((sum, h) => sum + h.shares * h.avgCost, 0);

    return {
      success: true,
      holdings,
      brokerDetected,
      statementType: "tradebook",
      totalPositions: holdings.length,
      totalInvested: Math.round(totalInvested * 100) / 100,
      totalTradesProcessed: tradesCount,
    };
  } else {
    // -----------------------------------------------------------------------
    // Holdings Statement / Portfolio Export Processing
    // -----------------------------------------------------------------------
    const rawHoldings: Holding[] = [];
    let idx = 0;

    for (const r of dataRows) {
      if (r.length <= Math.max(mapping.symbolCol, mapping.qtyCol)) {
        continue;
      }

      const rawSym = r[mapping.symbolCol]?.trim();
      if (!rawSym) continue;

      // Skip summary or footer rows
      const lowerFirst = (r[0] || "").toLowerCase();
      const lowerSym = rawSym.toLowerCase();
      if (
        lowerFirst.startsWith("total") ||
        lowerFirst.startsWith("grand total") ||
        lowerFirst.startsWith("sub total") ||
        lowerFirst.startsWith("disclaimer") ||
        lowerFirst.startsWith("note") ||
        lowerSym.startsWith("total") ||
        lowerSym.startsWith("grand total")
      ) {
        continue;
      }

      const shares = cleanNumber(r[mapping.qtyCol]);
      let avgCost =
        mapping.priceCol !== -1 ? cleanNumber(r[mapping.priceCol]) : 0;

      // If avgCost is missing or 0, check if current price / LTP is available
      if (avgCost <= 0 && mapping.currentPriceCol !== undefined) {
        avgCost = cleanNumber(r[mapping.currentPriceCol]);
      }

      if (shares <= 0 || avgCost <= 0) continue;

      const isin = mapping.isinCol !== undefined ? cleanIsin(r[mapping.isinCol]) : null;
      const rawName = mapping.nameCol !== undefined ? r[mapping.nameCol]?.trim() : undefined;

      const enriched = await enrichRow(
        rawSym,
        rawName,
        isin,
        shares,
        avgCost,
        idx++,
        brokerDetected
      );

      if (enriched) {
        rawHoldings.push(enriched);
      }
    }

    if (rawHoldings.length === 0) {
      throw new Error(
        "No valid holding positions found. Ensure rows have positive shares and average purchase costs."
      );
    }

    // Merge duplicate holdings (multi-lots) using volume-weighted average price
    const mergedMap = new Map<string, Holding>();
    for (const h of rawHoldings) {
      const key = `${h.market}:${h.symbol.toUpperCase()}`;
      const existing = mergedMap.get(key);
      if (!existing) {
        mergedMap.set(key, h);
      } else {
        const totalShares = existing.shares + h.shares;
        const weightedCost =
          (existing.shares * existing.avgCost + h.shares * h.avgCost) /
          totalShares;
        existing.shares = Math.round(totalShares * 1000) / 1000;
        existing.avgCost = Math.round(weightedCost * 100) / 100;
        if (!existing.instrumentKey && h.instrumentKey) {
          existing.instrumentKey = h.instrumentKey;
        }
      }
    }

    const holdings = Array.from(mergedMap.values());
    const totalInvested = holdings.reduce((sum, h) => sum + h.shares * h.avgCost, 0);

    return {
      success: true,
      holdings,
      brokerDetected,
      statementType: "holdings",
      totalPositions: holdings.length,
      totalInvested: Math.round(totalInvested * 100) / 100,
    };
  }
}
