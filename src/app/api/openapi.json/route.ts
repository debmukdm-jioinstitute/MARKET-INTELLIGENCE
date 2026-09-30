import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "Market Intelligence India API",
      description: "Institutional Equity Research, Nifty 50 Intraday Analytics, Macro Stress Modeling, Credit Intelligence, and Hugging Face AI Suite.",
      version: "1.0.0",
      contact: {
        name: "Market Intelligence Developer Team",
        url: "https://getmarketintelligence.in/connect/claude"
      }
    },
    servers: [
      {
        url: "https://getmarketintelligence.in",
        description: "Production Server"
      }
    ],
    paths: {
      "/api/export": {
        get: {
          summary: "Export Market Intelligence Data",
          description: "Fetches live Nifty 50 snapshot, 50 constituents, 13 sector weights, macro stress, and credit risk. Supports JSON, CSV, and formatted ASCII terminal outputs.",
          parameters: [
            {
              name: "format",
              in: "query",
              required: false,
              schema: { type: "string", enum: ["json", "csv", "terminal", "ascii"], default: "json" },
              description: "Output format"
            },
            {
              name: "symbol",
              in: "query",
              required: false,
              schema: { type: "string", default: "NIFTY50" },
              description: "Target symbol or benchmark"
            }
          ],
          responses: {
            "200": {
              description: "Export payload successfully returned"
            }
          }
        }
      },
      "/api/mcp": {
        post: {
          summary: "MCP JSON-RPC Endpoint",
          description: "Streamable HTTP MCP 2025-06-18 protocol endpoint executing tool calls, prompts, and resources for Claude and LLM agents.",
          responses: {
            "200": {
              description: "MCP Response"
            }
          }
        }
      },
      "/api/hf/sentiment": {
        post: {
          summary: "Hugging Face FinBERT Sentiment Analysis",
          description: "Classifies financial text into Positive, Negative, or Neutral with confidence scores using ProsusAI/finbert.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { text: { type: "string" } },
                  required: ["text"]
                }
              }
            }
          },
          responses: {
            "200": { description: "Sentiment result" }
          }
        }
      },
      "/api/hf/copilot": {
        post: {
          summary: "AI Copilot Intelligence Hub",
          description: "Multimodal AI research copilot combining zero-shot classification, FinBERT sentiment, market breadth, and BART summarization.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { prompt: { type: "string" } },
                  required: ["prompt"]
                }
              }
            }
          },
          responses: {
            "200": { description: "Copilot response with telemetry metadata" }
          }
        }
      },
      "/api/feeds/upstox/candles": {
        get: {
          summary: "Upstox Intraday & Historical Candle Feed",
          description: "Fetches live intraday (1D 5-min) and historical daily candles for NSE symbols.",
          parameters: [
            { name: "symbol", in: "query", required: true, schema: { type: "string" } },
            { name: "range", in: "query", required: false, schema: { type: "string", enum: ["1D", "1W", "1M", "1Y"], default: "1D" } }
          ],
          responses: {
            "200": { description: "OHLCV candle array" }
          }
        }
      }
    }
  };

  return NextResponse.json(spec, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
