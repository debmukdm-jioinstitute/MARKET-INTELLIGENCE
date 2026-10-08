import { NextResponse } from "next/server";
import { buildSnapshot } from "@/lib/snapshot";
import { fetchLiveBreadth } from "@/lib/feeds/india/upstox-breadth";
import { getNifty50Live } from "@/lib/nifty50-live";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const formatArg = searchParams.get("format");
  const userAgent = req.headers.get("user-agent") || "";
  
  // Default format to terminal if curl/Wget or explicitly format=terminal|ascii
  const isTerminalClient = userAgent.includes("curl") || userAgent.includes("Wget") || userAgent.includes("HTTPie");
  const format = formatArg || (isTerminalClient ? "terminal" : "json");

  const [snapshot, breadth, nifty50] = await Promise.all([
    buildSnapshot().catch(() => null),
    fetchLiveBreadth().catch(() => null),
    getNifty50Live(),
  ]);
  const wtxt = (w: number | null) => (w == null ? "—" : `${w.toFixed(2)}%`);

  if (format === "csv") {
    const csvRows = [
      "Symbol,Company Name,Sector,Weight (%)",
      ...nifty50.constituents.map(
        c => `"${c.symbol}","${c.name}","${c.sector}",${c.weightPct ?? ""}`
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
    const m = snapshot?.metrics;
    const num = (v: number | null | undefined, d = 2) => (v == null || !Number.isFinite(v) ? "—" : v.toFixed(d));
    const niftyChg = m?.nifty_1d_pct;

    const asciiLines = [
      "┌────────────────────────────────────────────────────────────────────────┐",
      "│              MARKET INTELLIGENCE INDIA - TERMINAL DATA EXPORT          │",
      `│  As Of: ${asOf.padEnd(58)}│`,
      "└────────────────────────────────────────────────────────────────────────┘",
      "",
      "--- MACRO SNAPSHOT ---",
      `• NIFTY 50 Level : ${num(m?.nifty)}${niftyChg != null ? ` (${niftyChg >= 0 ? "+" : ""}${niftyChg.toFixed(2)}%)` : ""}`,
      `• India VIX      : ${num(m?.india_vix)} (Volatility Index)`,
      `• USD / INR      : ${m?.usdinr != null ? `₹${num(m.usdinr)}` : "—"}`,
      `• Brent Crude    : ${m?.brent != null ? `$${num(m.brent)}/bbl` : "—"}`,
      `• Stress Score   : ${snapshot?.stress ? `${snapshot.stress.score}/100 [Band: ${snapshot.stress.band}]` : "—"}`,
      "",
      "--- NIFTY 50 CONSTITUENTS (live NSE list, market-cap weights) ---",
      "SYMBOL      COMPANY NAME                 SECTOR            WEIGHT",
      "─────────── ──────────────────────────── ───────────────── ────────"
    ];

    for (const c of nifty50.constituents) {
      const sym = c.symbol.padEnd(11);
      const name = c.name.slice(0, 28).padEnd(28);
      const sec = c.sector.slice(0, 17).padEnd(17);
      asciiLines.push(`${sym} ${name} ${sec} ${wtxt(c.weightPct).padStart(8)}`);
    }

    asciiLines.push(
      "",
      `--- SECTOR WEIGHTS (${nifty50.sectorWeights.length} SECTORS, DERIVED) ---`
    );
    for (const s of nifty50.sectorWeights) {
      asciiLines.push(`• ${s.name.padEnd(35)} : ${wtxt(s.weightPct)}`);
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
    constituents: nifty50.constituents,
    sectorWeights: nifty50.sectorWeights,
    weightMethod: nifty50.weightMethod,
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
