import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const mcpDiscovery = {
    schema_version: "1.0.0",
    name: "Market Intelligence MCP Server",
    description: "Autonomous Institutional Equity Research, Nifty 50 Intraday Analytics, Credit Intelligence, Macro Stress Engine, and Hugging Face Financial AI Suite.",
    homepage: "https://getmarketintelligence.in",
    endpoints: [
      {
        type: "http-stream",
        url: "https://getmarketintelligence.in/api/mcp",
        auth: {
          type: "none"
        }
      }
    ],
    capabilities: {
      tools: {
        listChanged: true
      },
      prompts: {
        listChanged: false
      },
      resources: {
        listChanged: false,
        subscribe: false
      }
    },
    version: "2.4.0"
  };

  return NextResponse.json(mcpDiscovery, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
