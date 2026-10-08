import { NextResponse } from "next/server";
import { buildSnapshot } from "@/lib/snapshot";
import { fetchLiveBreadth } from "@/lib/feeds/india/upstox-breadth";
import { getNifty50Live } from "@/lib/nifty50-live";

export const dynamic = "force-dynamic";

export async function GET() {
  const [snapshot, breadth, nifty50] = await Promise.all([
    buildSnapshot().catch(() => null),
    fetchLiveBreadth().catch(() => null),
    getNifty50Live(),
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
    `=== 4. NIFTY 50 INDEX CONSTITUENTS (live NSE list; ${nifty50.weightMethod}) ===`,
    JSON.stringify(nifty50.constituents, null, 2),
    "",
    "=== 5. NIFTY 50 SECTOR WEIGHTS (derived from the constituents above) ===",
    JSON.stringify(nifty50.sectorWeights, null, 2),
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
