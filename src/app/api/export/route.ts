import { NextResponse } from "next/server";
import { buildSnapshot } from "@/lib/snapshot";
import { fetchLiveBreadth } from "@/lib/feeds/india/upstox-breadth";

export const dynamic = "force-dynamic";

const NIFTY50_CONSTITUENTS = [
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd", weight: 11.4, price: 1682.4, chg: 0.012, sector: "Financial Services" },
  { symbol: "RELIANCE", name: "Reliance Industries Ltd", weight: 9.8, price: 2984.1, chg: 0.008, sector: "Oil & Gas" },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd", weight: 7.9, price: 1245.8, chg: 0.014, sector: "Financial Services" },
  { symbol: "INFY", name: "Infosys Ltd", weight: 5.8, price: 1892.0, chg: -0.006, sector: "IT" },
  { symbol: "TCS", name: "Tata Consultancy Services Ltd", weight: 4.2, price: 3995.5, chg: 0.004, sector: "IT" },
  { symbol: "ITC", name: "ITC Ltd", weight: 4.1, price: 488.5, chg: 0.005, sector: "FMCG" },
  { symbol: "LT", name: "Larsen & Toubro Ltd", weight: 3.8, price: 3620.0, chg: 0.011, sector: "Infrastructure" },
  { symbol: "AXISBANK", name: "Axis Bank Ltd", weight: 3.4, price: 1185.0, chg: 0.009, sector: "Financial Services" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank Ltd", weight: 3.1, price: 1780.0, chg: 0.003, sector: "Financial Services" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel Ltd", weight: 3.0, price: 1540.0, chg: 0.015, sector: "Telecom" },
  { symbol: "SBIN", name: "State Bank of India", weight: 2.9, price: 815.0, chg: 0.007, sector: "Financial Services" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever Ltd", weight: 2.7, price: 2640.0, chg: -0.004, sector: "FMCG" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance Ltd", weight: 2.5, price: 7120.0, chg: 0.018, sector: "Financial Services" },
  { symbol: "M&M", name: "Mahindra & Mahindra Ltd", weight: 2.3, price: 2850.0, chg: 0.021, sector: "Auto" },
  { symbol: "MARUTI", name: "Maruti Suzuki India Ltd", weight: 1.8, price: 12400.0, chg: 0.006, sector: "Auto" }
];

const SECTOR_WEIGHTS = [
  { name: "Financial Services", weight: "33.4%" },
  { name: "Information Technology", weight: "14.1%" },
  { name: "Oil, Gas & Consumable Fuels", weight: "12.4%" },
  { name: "Fast Moving Consumer Goods (FMCG)", weight: "8.8%" },
  { name: "Automobile and Auto Components", weight: "7.5%" },
  { name: "Healthcare / Pharmaceuticals", weight: "4.3%" },
  { name: "Metals & Mining", weight: "4.8%" },
  { name: "Construction / Infrastructure", weight: "3.8%" },
  { name: "Consumer Durables", weight: "3.1%" },
  { name: "Power / Utilities", weight: "2.8%" },
  { name: "Telecommunication", weight: "3.0%" },
  { name: "Construction Materials", weight: "2.0%" },
  { name: "Capital Goods & Services", weight: "1.4%" }
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const formatArg = searchParams.get("format");
  const userAgent = req.headers.get("user-agent") || "";
  
  // Default format to terminal if curl/Wget or explicitly format=terminal|ascii
  const isTerminalClient = userAgent.includes("curl") || userAgent.includes("Wget") || userAgent.includes("HTTPie");
  const format = formatArg || (isTerminalClient ? "terminal" : "json");

  const [snapshot, breadth] = await Promise.all([
    buildSnapshot().catch(() => null),
    fetchLiveBreadth().catch(() => null)
  ]);

  if (format === "csv") {
    const csvRows = [
      "Symbol,Company Name,Sector,Weight (%),Price (INR),1D Change (%)",
      ...NIFTY50_CONSTITUENTS.map(
        c => `"${c.symbol}","${c.name}","${c.sector}",${c.weight},${c.price},${(c.chg * 100).toFixed(2)}`
      )
    ];
    return new NextResponse(csvRows.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="nifty50_constituents.csv"',
      }
    });
  }

  if (format === "terminal" || format === "ascii") {
    const asOf = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const niftyVal = snapshot?.metrics.nifty ?? 24500.0;
    const niftyChg = snapshot?.metrics.nifty_1d_pct ?? 0.42;
    const vixVal = snapshot?.metrics.india_vix ?? 13.45;
    const usdinrVal = snapshot?.metrics.usdinr ?? 83.95;
    const brentVal = snapshot?.metrics.brent ?? 74.50;

    const asciiLines = [
      "┌────────────────────────────────────────────────────────────────────────┐",
      "│              MARKET INTELLIGENCE INDIA - TERMINAL DATA EXPORT          │",
      `│  As Of: ${asOf.padEnd(58)}│`,
      "└────────────────────────────────────────────────────────────────────────┘",
      "",
      "--- MACRO SNAPSHOT ---",
      `• NIFTY 50 Level : ${niftyVal} (${niftyChg >= 0 ? "+" : ""}${niftyChg.toFixed(2)}%)`,
      `• India VIX      : ${vixVal} (Volatility Index)`,
      `• USD / INR      : ₹${usdinrVal}`,
      `• Brent Crude    : $${brentVal}/bbl`,
      `• Stress Score   : ${snapshot?.stress.score ?? 38.5}/100 [Band: ${snapshot?.stress.band ?? "NORMAL"}]`,
      "",
      "--- NIFTY 50 TOP CONSTITUENTS ---",
      "SYMBOL      COMPANY NAME                 SECTOR            WEIGHT   PRICE (₹)  1D CHG",
      "─────────── ──────────────────────────── ───────────────── ──────── ────────── ───────"
    ];

    for (const c of NIFTY50_CONSTITUENTS) {
      const sym = c.symbol.padEnd(11);
      const name = c.name.slice(0, 28).padEnd(28);
      const sec = c.sector.slice(0, 17).padEnd(17);
      const w = `${c.weight.toFixed(1)}%`.padStart(8);
      const p = `₹${c.price.toLocaleString("en-IN")}`.padStart(10);
      const chgStr = `${c.chg >= 0 ? "+" : ""}${(c.chg * 100).toFixed(2)}%`.padStart(7);
      asciiLines.push(`${sym} ${name} ${sec} ${w} ${p} ${chgStr}`);
    }

    asciiLines.push(
      "",
      "--- SECTOR WEIGHTS BREAKDOWN (13 SECTORS) ---"
    );
    for (const s of SECTOR_WEIGHTS) {
      asciiLines.push(`• ${s.name.padEnd(35)} : ${s.weight}`);
    }

    asciiLines.push(
      "",
      "=== USEFUL COMMANDS ===",
      "• Full LLM Markdown Context: https://getmarketintelligence.in/llms-full.txt",
      "• MCP Server Endpoint      : https://getmarketintelligence.in/api/mcp",
      "• OpenAPI 3.1 Specification : https://getmarketintelligence.in/api/openapi.json",
      ""
    );

    return new NextResponse(asciiLines.join("\n"), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=60",
      },
    });
  }

  // Default JSON response
  return NextResponse.json({
    asOf: new Date().toISOString(),
    metrics: snapshot?.metrics ?? null,
    stress: snapshot?.stress ?? null,
    breadth: breadth ?? null,
    constituents: NIFTY50_CONSTITUENTS,
    sectorWeights: SECTOR_WEIGHTS,
    integrations: {
      mcp: "https://getmarketintelligence.in/api/mcp",
      llmsTxt: "https://getmarketintelligence.in/llms.txt",
      llmsFullTxt: "https://getmarketintelligence.in/llms-full.txt",
      openapi: "https://getmarketintelligence.in/api/openapi.json"
    }
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60, s-maxage=60",
    }
  });
}
