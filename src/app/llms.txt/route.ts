import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET() {
  const content = `# Market Intelligence India (getmarketintelligence.in)

> Autonomous Institutional Equity Research, Nifty 50 Intraday Analytics, Credit Intelligence, Macro Stress Engine, and Hugging Face Financial AI Suite for India & Global Markets.

## Overview
Market Intelligence India provides institutional-grade market data, quantitative risk metrics, credit intelligence for Nifty 500 & Smallcaps, macro stress modeling, and open Hugging Face financial AI tools (FinBERT sentiment, BART summarizer, MiniLM embeddings, MNLI zero-shot classifier).

All data on this platform is accessible via:
1. Web Interface: https://getmarketintelligence.in
2. Claude / LLM Standard context: https://getmarketintelligence.in/llms.txt & https://getmarketintelligence.in/llms-full.txt
3. Model Context Protocol (MCP Server): https://getmarketintelligence.in/api/mcp
4. Terminal & Curl Exports: \`curl https://getmarketintelligence.in/api/export\`
5. OpenAPI 3.1 Spec: https://getmarketintelligence.in/api/openapi.json

## Key Web Pages & Data Views
- Nifty 50 Markets & Intraday Trajectory: https://getmarketintelligence.in/markets/india/nifty50
  - Live 5-minute Upstox candles, 50 Nifty constituents, and complete 13 sector weights breakdown.
- AI Copilot Terminal: https://getmarketintelligence.in/intelligence
  - Multimodal research assistant powered by ProsusAI/FinBERT and BART summarization.
- Credit Intelligence & Risk: https://getmarketintelligence.in/credit
  - Debt risk modeling, Altman Z-score, interest coverage, and liquidity metrics across Nifty 500.
- Macro Stress & Transmission Engine: https://getmarketintelligence.in/stress & https://getmarketintelligence.in/transmission
  - Macro stress index, cross-asset betas (Brent, USD/INR, US10Y), and scenario shock simulation.
- Institutional intelligence (FII/DII, ownership signals): https://getmarketintelligence.in/intelligence/institutional

## Claude & LLM Integration Options

### Option 1: Model Context Protocol (MCP) Server
- MCP Endpoint: https://getmarketintelligence.in/api/mcp
- Protocol: JSON-RPC 2.0 / Streamable HTTP (Specification 2025-06-18)
- Configuration for Claude Desktop / Cursor / Claude Code (\`claude_desktop_config.json\`):
\`\`\`json
{
  "mcpServers": {
    "market-intelligence": {
      "url": "https://getmarketintelligence.in/api/mcp"
    }
  }
}
\`\`\`

### Option 2: Full LLM Context Text Dump
- URL: https://getmarketintelligence.in/llms-full.txt
- Contains raw realtime snapshot, all 50 constituents, 13 sector weights, credit risk scores, and Hugging Face model suite parameters.

## Terminal & CLI Options

### Option 1: Direct Curl Command
\`\`\`bash
# Print formatted ASCII market table in terminal
curl -s https://getmarketintelligence.in/api/export

# Get JSON format for jq processing
curl -s https://getmarketintelligence.in/api/export?format=json | jq .
\`\`\`

### Option 2: Node CLI Tool
\`\`\`bash
# Run CLI tool from workspace
npm run cli nifty
npm run cli overview
npm run cli sentiment "HDFC Bank reported quarterly net profit growth"
\`\`\`

## Open Hugging Face AI Models Suite
- Financial Sentiment: ProsusAI/finbert (\`/api/hf/sentiment\`)
- Text Summarization: facebook/bart-large-cnn (\`/api/hf/summarize\`)
- Zero-Shot News Classification: facebook/bart-large-mnli (\`/api/hf/classify\`)
- Financial Embeddings: sentence-transformers/all-MiniLM-L6-v2 (\`/api/hf/embed\`)

For full raw platform datasets, visit https://getmarketintelligence.in/llms-full.txt.
`;

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
