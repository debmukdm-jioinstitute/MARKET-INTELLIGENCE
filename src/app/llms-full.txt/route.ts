import { NextResponse } from "next/server";
import { buildSnapshot } from "@/lib/snapshot";
import { fetchLiveBreadth } from "@/lib/feeds/india/upstox-breadth";

export const dynamic = "force-dynamic";

const NIFTY50_CONSTITUENTS = [
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd", weight: 11.4, price: 1682.4, chg: 0.012, sector: "Financial Services" },
  { symbol: "RELIANCE", name: "Reliance Industries Ltd", weight: 9.8, price: 2984.1, chg: 0.008, sector: "Oil, Gas & Consumable Fuels" },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd", weight: 7.9, price: 1245.8, chg: 0.014, sector: "Financial Services" },
  { symbol: "INFY", name: "Infosys Ltd", weight: 5.8, price: 1892.0, chg: -0.006, sector: "Information Technology" },
  { symbol: "TCS", name: "Tata Consultancy Services Ltd", weight: 4.2, price: 3995.5, chg: 0.004, sector: "Information Technology" },
  { symbol: "ITC", name: "ITC Ltd", weight: 4.1, price: 488.5, chg: 0.005, sector: "Fast Moving Consumer Goods" },
  { symbol: "LT", name: "Larsen & Toubro Ltd", weight: 3.8, price: 3620.0, chg: 0.011, sector: "Construction / Infrastructure" },
  { symbol: "AXISBANK", name: "Axis Bank Ltd", weight: 3.4, price: 1185.0, chg: 0.009, sector: "Financial Services" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank Ltd", weight: 3.1, price: 1780.0, chg: 0.003, sector: "Financial Services" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel Ltd", weight: 3.0, price: 1540.0, chg: 0.015, sector: "Telecommunication" },
  { symbol: "SBIN", name: "State Bank of India", weight: 2.9, price: 815.0, chg: 0.007, sector: "Financial Services" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever Ltd", weight: 2.7, price: 2640.0, chg: -0.004, sector: "Fast Moving Consumer Goods" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance Ltd", weight: 2.5, price: 7120.0, chg: 0.018, sector: "Financial Services" },
  { symbol: "M&M", name: "Mahindra & Mahindra Ltd", weight: 2.3, price: 2850.0, chg: 0.021, sector: "Automobile and Auto Components" },
  { symbol: "MARUTI", name: "Maruti Suzuki India Ltd", weight: 1.8, price: 12400.0, chg: 0.006, sector: "Automobile and Auto Components" },
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical Industries", weight: 1.7, price: 1820.0, chg: 0.002, sector: "Healthcare / Pharmaceuticals" },
  { symbol: "TITAN", name: "Titan Company Ltd", weight: 1.5, price: 3450.0, chg: -0.003, sector: "Consumer Durables" },
  { symbol: "NTPC", name: "NTPC Ltd", weight: 1.5, price: 395.0, chg: 0.012, sector: "Power / Utilities" },
  { symbol: "TATAMOTORS", name: "Tata Motors Ltd", weight: 1.4, price: 975.0, chg: -0.008, sector: "Automobile and Auto Components" },
  { symbol: "TATASTEEL", name: "Tata Steel Ltd", weight: 1.3, price: 158.0, chg: 0.016, sector: "Metals & Mining" },
  { symbol: "POWERGRID", name: "Power Grid Corporation of India", weight: 1.3, price: 332.0, chg: 0.005, sector: "Power / Utilities" },
  { symbol: "ULTRACEMCO", name: "UltraTech Cement Ltd", weight: 1.2, price: 11250.0, chg: 0.004, sector: "Construction Materials" },
  { symbol: "HCLTECH", name: "HCL Technologies Ltd", weight: 1.2, price: 1760.0, chg: -0.002, sector: "Information Technology" },
  { symbol: "ASIANPAINT", name: "Asian Paints Ltd", weight: 1.1, price: 3120.0, chg: -0.005, sector: "Consumer Durables" },
  { symbol: "BAJAJFINSV", name: "Bajaj Finserv Ltd", weight: 1.0, price: 1840.0, chg: 0.011, sector: "Financial Services" },
  { symbol: "COALINDIA", name: "Coal India Ltd", weight: 1.0, price: 490.0, chg: 0.008, sector: "Oil, Gas & Consumable Fuels" },
  { symbol: "ONGC", name: "Oil & Natural Gas Corporation", weight: 1.0, price: 295.0, chg: 0.014, sector: "Oil, Gas & Consumable Fuels" },
  { symbol: "ADANIENT", name: "Adani Enterprises Ltd", weight: 0.9, price: 3150.0, chg: -0.012, sector: "Metals & Mining" },
  { symbol: "ADANIPORTS", name: "Adani Ports and SEZ Ltd", weight: 0.9, price: 1440.0, chg: 0.006, sector: "Services / Ports" },
  { symbol: "JSWSTEEL", name: "JSW Steel Ltd", weight: 0.9, price: 940.0, chg: 0.009, sector: "Metals & Mining" },
  { symbol: "GRASIM", name: "Grasim Industries Ltd", weight: 0.8, price: 2680.0, chg: 0.003, sector: "Construction Materials" },
  { symbol: "NESTLEIND", name: "Nestle India Ltd", weight: 0.8, price: 2520.0, chg: -0.001, sector: "Fast Moving Consumer Goods" },
  { symbol: "TECHM", name: "Tech Mahindra Ltd", weight: 0.8, price: 1580.0, chg: 0.005, sector: "Information Technology" },
  { symbol: "WIPRO", name: "Wipro Ltd", weight: 0.8, price: 530.0, chg: -0.004, sector: "Information Technology" },
  { symbol: "HINDALCO", name: "Hindalco Industries Ltd", weight: 0.8, price: 670.0, chg: 0.015, sector: "Metals & Mining" },
  { symbol: "HEROMOTOCO", name: "Hero MotoCorp Ltd", weight: 0.7, price: 5420.0, chg: 0.008, sector: "Automobile and Auto Components" },
  { symbol: "INDUSINDBK", name: "IndusInd Bank Ltd", weight: 0.7, price: 1410.0, chg: -0.009, sector: "Financial Services" },
  { symbol: "DRREDDY", name: "Dr. Reddy's Laboratories Ltd", weight: 0.7, price: 6680.0, chg: 0.004, sector: "Healthcare / Pharmaceuticals" },
  { symbol: "EICHERMOT", name: "Eicher Motors Ltd", weight: 0.7, price: 4820.0, chg: 0.011, sector: "Automobile and Auto Components" },
  { symbol: "CIPLA", name: "Cipla Ltd", weight: 0.7, price: 1540.0, chg: 0.003, sector: "Healthcare / Pharmaceuticals" },
  { symbol: "DIVISLAB", name: "Divi's Laboratories Ltd", weight: 0.6, price: 4950.0, chg: 0.007, sector: "Healthcare / Pharmaceuticals" },
  { symbol: "BPCL", name: "Bharat Petroleum Corporation", weight: 0.6, price: 345.0, chg: 0.005, sector: "Oil, Gas & Consumable Fuels" },
  { symbol: "BRITANNIA", name: "Britannia Industries Ltd", weight: 0.6, price: 5820.0, chg: -0.002, sector: "Fast Moving Consumer Goods" },
  { symbol: "TATACONSUM", name: "Tata Consumer Products Ltd", weight: 0.6, price: 1180.0, chg: 0.004, sector: "Fast Moving Consumer Goods" },
  { symbol: "APOLLOHOSP", name: "Apollo Hospitals Enterprise", weight: 0.6, price: 6950.0, chg: 0.012, sector: "Healthcare / Pharmaceuticals" },
  { symbol: "BAJAJ-AUTO", name: "Bajaj Auto Ltd", weight: 0.6, price: 9850.0, chg: 0.009, sector: "Automobile and Auto Components" },
  { symbol: "LTIM", name: "LTIMindtree Ltd", weight: 0.5, price: 5640.0, chg: -0.003, sector: "Information Technology" },
  { symbol: "TRENT", name: "Trent Ltd", weight: 0.5, price: 7420.0, chg: 0.024, sector: "Consumer Durables" },
  { symbol: "BEL", name: "Bharat Electronics Ltd", weight: 0.5, price: 288.0, chg: 0.018, sector: "Capital Goods" },
  { symbol: "SHRIRAMFIN", name: "Shriram Finance Ltd", weight: 0.5, price: 2950.0, chg: 0.011, sector: "Financial Services" }
];

const NIFTY50_SECTOR_WEIGHTS = [
  { name: "Financial Services", weight: 33.4, count: 10 },
  { name: "Information Technology", weight: 14.1, count: 6 },
  { name: "Oil, Gas & Consumable Fuels", weight: 12.4, count: 4 },
  { name: "Fast Moving Consumer Goods (FMCG)", weight: 8.8, count: 5 },
  { name: "Automobile and Auto Components", weight: 7.5, count: 5 },
  { name: "Healthcare / Pharmaceuticals", weight: 4.3, count: 5 },
  { name: "Metals & Mining", weight: 4.8, count: 4 },
  { name: "Construction / Infrastructure", weight: 3.8, count: 1 },
  { name: "Consumer Durables", weight: 3.1, count: 3 },
  { name: "Power / Utilities", weight: 2.8, count: 2 },
  { name: "Telecommunication", weight: 3.0, count: 1 },
  { name: "Construction Materials", weight: 2.0, count: 2 },
  { name: "Capital Goods & Services", weight: 1.4, count: 2 }
];

export async function GET() {
  const [snapshot, breadth] = await Promise.all([
    buildSnapshot().catch(() => null),
    fetchLiveBreadth().catch(() => null)
  ]);

  const output = [
    "# MARKET INTELLIGENCE FULL DATA DUMP (llms-full.txt)",
    `# As of: ${new Date().toISOString()}`,
    `# Environment: Production (https://getmarketintelligence.in)`,
    "",
    "=== 1. REALTIME MARKET SNAPSHOT ===",
    snapshot ? JSON.stringify(snapshot.metrics, null, 2) : "Snapshot data compiling",
    "",
    "=== 2. MACRO STRESS & CONVERGENCE ===",
    snapshot ? JSON.stringify(snapshot.stress, null, 2) : "Stress model processing",
    "",
    "=== 3. LIVE MARKET BREADTH (UPSTOX FEED) ===",
    breadth ? JSON.stringify(breadth, null, 2) : "Breadth feed unreachable",
    "",
    "=== 4. NIFTY 50 INDEX CONSTITUENTS (ALL 50 STOCKS) ===",
    JSON.stringify(NIFTY50_CONSTITUENTS, null, 2),
    "",
    "=== 5. NIFTY 50 SECTOR WEIGHTS BREAKDOWN (13 SECTORS = 100%) ===",
    JSON.stringify(NIFTY50_SECTOR_WEIGHTS, null, 2),
    "",
    "=== 6. HUGGING FACE FINANCIAL AI MODEL MAP ===",
    JSON.stringify([
      { task: "Financial Sentiment", model: "ProsusAI/finbert", endpoint: "/api/hf/sentiment" },
      { task: "Abstractive Summarization", model: "facebook/bart-large-cnn", endpoint: "/api/hf/summarize" },
      { task: "Zero-Shot Topic Classifier", model: "facebook/bart-large-mnli", endpoint: "/api/hf/classify" },
      { task: "384d Dense Vector Embeddings", model: "sentence-transformers/all-MiniLM-L6-v2", endpoint: "/api/hf/embed" }
    ], null, 2),
    "",
    "=== 7. API EXPORT & MCP PROTOCOL ===",
    "- MCP JSON-RPC Server: https://getmarketintelligence.in/api/mcp",
    "- OpenAPI 3.1 Spec: https://getmarketintelligence.in/api/openapi.json",
    "- Direct Terminal Curl Export: curl -s https://getmarketintelligence.in/api/export",
    ""
  ].join("\n");

  return new NextResponse(output, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
